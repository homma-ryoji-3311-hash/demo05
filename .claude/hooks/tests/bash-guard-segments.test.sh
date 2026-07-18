#!/usr/bin/env bash
# hook 回帰テスト（#30）: pre-tool-use-bash のガードが複合コマンドで「後段コマンドのトークン」を
# 「前段コマンド」に誤帰属しないこと。誤爆（正当な操作のブロック＝fail-closed の暴発）を防ぎつつ、
# 本来のブロック（main を進める push・破壊的 git・rm -rf 等）は維持する。
#
# 依存なし（bats 不要）。失敗で非ゼロ終了する。実行:
#   bash .claude/hooks/tests/bash-guard-segments.test.sh
set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0
pass() { echo "  ok   - $1"; }
fail() { echo "  FAIL - $1"; FAIL=1; }

mkrepo() {
  local branch="$1" dir
  dir="$(mktemp -d)"
  git -C "$dir" init -q
  git -C "$dir" config user.email t@t
  git -C "$dir" config user.name t
  git -C "$dir" checkout -q -b "$branch" 2>/dev/null
  printf '%s' "$dir"
}

rc_for() {
  local proj="$1" cmd="$2"
  CLAUDE_PROJECT_DIR="$proj" bash "$HOOKS_DIR/pre-tool-use-bash.sh" \
    <<<"{\"tool_input\":{\"command\":\"$cmd\"}}" >/dev/null 2>&1
  echo $?
}
allow() { [[ "$(rc_for "$1" "$2")" == "0" ]] && pass "allow: $2" || fail "誤ブロック(#30 再発): $2"; }
block() { [[ "$(rc_for "$1" "$2")" == "2" ]] && pass "block: $2" || fail "素通り(ガード後退): $2"; }

echo "# #30 複合コマンドのガード誤帰属（作業ブランチ feature/slice-01）"
REPO="$(mkrepo feature/slice-01)"

# --- 誤爆しないこと（#30 の再現2ケース＋素の作業ブランチ push・修正後は allow） ---
allow "$REPO" 'rm -f x && git checkout -b feature/slice-99'
allow "$REPO" 'git push 2>&1 | tail -1 ; gh pr create --base main --head feature/slice-99'
allow "$REPO" 'git push -u origin feature/slice-01'

# --- 本来のブロックは維持（回帰防止） ---
block "$REPO" 'git push origin main'
block "$REPO" 'git push --force origin feature/slice-01'
block "$REPO" 'git checkout -f main'
block "$REPO" 'git checkout main && git push'
block "$REPO" 'rm -rf node_modules'
block "$REPO" 'git reset --hard origin/main'

rm -rf "$REPO" 2>/dev/null || true

echo
if [[ "$FAIL" == "0" ]]; then echo "PASS: all #30 segment-guard hook tests"; exit 0
else echo "FAIL: #30 segment-guard hook tests"; exit 1; fi
