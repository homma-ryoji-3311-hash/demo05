#!/usr/bin/env bash
# 共通ライブラリ。各 hook が source する。
# 設計原則（計画書 §6）:
#   - exit 2 = ブロック（stderr がモデルに返る）
#   - exit 1 = 非ブロッキング。ポリシー強制に exit 1 を使うのは典型的バグ
#   - ブロック時の stderr には「修正指示」を書く（良性のプロンプトインジェクション）

set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_DIR="${PROJECT_DIR}/logs/hooks"

# current_branch : 現在のブランチ名を安全に返す。取れなければ空文字。
#   `git rev-parse --abbrev-ref HEAD` は unborn branch（コミット0件）で
#   stdout に "HEAD" を出しつつ exit 128 する癖があり、`... || echo x` と
#   組み合わせると "HEAD\nx" という壊れた2行の値になる（初回ブートストラップの地雷）。
#   `git branch --show-current` は unborn でも正しいブランチ名を返し、
#   detached HEAD では空文字を返す（＝呼び出し側で fail-closed に倒せる）。
#   呼び出し側は「空文字＝未知のブランチ」として安全側に扱うこと。
current_branch() {
  git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || true
}

# slice_branch_layer <branch> : 正規の slice 作業ブランチなら層名（feature|spec）を返す。
#   一致: feature/slice-01, spec/slice-2, feature/slice-0012-login-form
#   不一致（空文字を返す）: feature/slice-bootstrap, feature/slice-, main, ""（unborn/detached）
#   採番規約（/board・ADR-0013）と同じ厳しさで判定する。番号のない slice- は作業ブランチではない。
#   glob `feature/slice-*` を各 hook に散らすと「パターンに寄せた命名」で fail-open になる
#   （docs/memory-bank/hook-defect-slice-pattern-too-broad-2026-07-13.md 参照）。
slice_branch_layer() {
  if [[ "${1:-}" =~ ^(feature|spec)/slice-0*[0-9]+(-[A-Za-z0-9-]+)?$ ]]; then
    printf '%s' "${BASH_REMATCH[1]}"
  fi
}

# jq_field <json> <python式> : python3 があれば使い、無ければ空を返す
json_field() {
  local payload="$1" expr="$2"
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$payload" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
v = $expr
print(v if v is not None else '')
" 2>/dev/null
  fi
}

# hook_log <hook名> <decision> <理由>
# 何がいつブロックされたかを JSON Lines で永続化する（Harness-Keeper の監査証跡）。
# ブロック頻度の高いルールが「hook 昇格・スライス設計見直し」の観察データになる。
hook_log() {
  mkdir -p "$LOG_DIR" 2>/dev/null || return 0
  local ts; ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '{"ts":"%s","hook":"%s","decision":"%s","reason":"%s"}\n' \
    "$ts" "${1//\"/\'}" "${2//\"/\'}" "${3//\"/\'}" \
    >> "${LOG_DIR}/$(date -u +%Y-%m).jsonl" 2>/dev/null || true
}

# block <hook名> <モデルに返すメッセージ>
block() {
  hook_log "$1" "block" "$2"
  printf '%s\n' "$2" >&2
  exit 2
}

# additional_context <文字列> : 非ブロッキングでモデルに文脈を注入する
additional_context() {
  local ev="$1" text="$2"
  if command -v python3 >/dev/null 2>&1; then
    EV="$ev" TEXT="$text" python3 -c "
import json, os
print(json.dumps({'hookSpecificOutput': {
    'hookEventName': os.environ['EV'],
    'additionalContext': os.environ['TEXT'],
}}))
"
  else
    printf '%s\n' "$text"
  fi
  exit 0
}
