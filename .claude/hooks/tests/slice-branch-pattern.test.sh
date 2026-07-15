#!/usr/bin/env bash
# hook 回帰テスト: slice ブランチ判定は「番号必須」（採番規約と同じ厳しさ）。
#
# 背景: glob `feature/slice-*` が `feature/slice-bootstrap` のような番号なしの
#   ブランチまで拾い、stop-gate の誤発動と commit/push 権限の fail-open を起こした。
#   判定は lib.sh の slice_branch_layer() に一元化し、番号必須の正規表現で行う。
#   （docs/memory-bank/hook-defect-slice-pattern-too-broad-2026-07-13.md 参照）
#
# 依存なし（bats 不要）。失敗で非ゼロ終了する。実行:
#   bash .claude/hooks/tests/slice-branch-pattern.test.sh
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

run_hook() {
  local hook="$1" proj="$2" payload="$3"
  CLAUDE_PROJECT_DIR="$proj" bash "$HOOKS_DIR/$hook" <<<"$payload" >/dev/null 2>&1
  echo $?
}

echo "# slice ブランチ判定（番号必須）"

# --- 1) slice_branch_layer() の単体判定 ---
layer() { bash -c 'source "'"$HOOKS_DIR"'/lib.sh"; slice_branch_layer "$1"' _ "$1"; }
[[ "$(layer feature/slice-01)" == "feature" ]]              && pass "feature/slice-01 -> feature"              || fail "feature/slice-01: got [$(layer feature/slice-01)]"
[[ "$(layer spec/slice-2)" == "spec" ]]                     && pass "spec/slice-2 -> spec"                     || fail "spec/slice-2: got [$(layer spec/slice-2)]"
[[ "$(layer feature/slice-0012-login-form)" == "feature" ]] && pass "feature/slice-0012-login-form -> feature" || fail "feature/slice-0012-login-form: got [$(layer feature/slice-0012-login-form)]"
[[ -z "$(layer feature/slice-bootstrap)" ]]                 && pass "feature/slice-bootstrap -> 非作業ブランチ" || fail "feature/slice-bootstrap が作業ブランチ扱い <- 回帰"
[[ -z "$(layer feature/slice-)" ]]                          && pass "feature/slice- -> 非作業ブランチ"          || fail "feature/slice- が作業ブランチ扱い"
[[ -z "$(layer chore/init)" ]]                              && pass "chore/init -> 非作業ブランチ"              || fail "chore/init が作業ブランチ扱い"
[[ -z "$(layer '')" ]]                                      && pass "空文字(detached/unborn) -> 非作業ブランチ" || fail "空文字が作業ブランチ扱い"

# --- 2) pre-tool-use-bash: 番号なしブランチでは commit がブロックされる ---
REPO_BOOT="$(mkrepo feature/slice-bootstrap)"
RC="$(run_hook pre-tool-use-bash.sh "$REPO_BOOT" '{"tool_input":{"command":"git commit -m x"}}')"
[[ "$RC" == "2" ]] \
  && pass "feature/slice-bootstrap での git commit は block (exit 2)" \
  || fail "feature/slice-bootstrap での git commit が素通り (exit $RC) <- fail-open"

# --- 3) pre-tool-use-bash: 正規の作業ブランチでは commit が通る ---
REPO_OK="$(mkrepo feature/slice-01)"
RC="$(run_hook pre-tool-use-bash.sh "$REPO_OK" '{"tool_input":{"command":"git commit -m x"}}')"
[[ "$RC" == "0" ]] \
  && pass "feature/slice-01 での git commit は allow (exit 0)" \
  || fail "feature/slice-01 での git commit が誤ブロック (exit $RC)"

REPO_SFX="$(mkrepo feature/slice-0012-login-form)"
RC="$(run_hook pre-tool-use-bash.sh "$REPO_SFX" '{"tool_input":{"command":"git commit -m x"}}')"
[[ "$RC" == "0" ]] \
  && pass "feature/slice-0012-login-form での git commit は allow (exit 0)" \
  || fail "feature/slice-0012-login-form での git commit が誤ブロック (exit $RC)"

# --- 4) stop-gate: 番号なしブランチではゲートしない ---
RC="$(run_hook stop-gate.sh "$REPO_BOOT" '{}')"
[[ "$RC" == "0" ]] \
  && pass "feature/slice-bootstrap で stop-gate は skip (exit 0)" \
  || fail "feature/slice-bootstrap で stop-gate が誤発動 (exit $RC) <- 回帰"

# --- 5) stop-gate: 正規の feature ブランチではテスト結果が無ければブロック（従来動作の維持） ---
RC="$(run_hook stop-gate.sh "$REPO_OK" '{}')"
[[ "$RC" == "2" ]] \
  && pass "feature/slice-01 (テスト結果なし) で stop-gate は block (exit 2)" \
  || fail "feature/slice-01 で stop-gate が素通り (exit $RC)"

# --- 6) protect-paths: 番号なしブランチは fail-closed（層管理対象へ書けない） ---
RC="$(run_hook protect-paths.sh "$REPO_BOOT" '{"tool_input":{"file_path":"'"$REPO_BOOT"'/apps/service/x.ts"}}')"
[[ "$RC" == "2" ]] \
  && pass "feature/slice-bootstrap での apps/service/ 書込は block (exit 2)" \
  || fail "feature/slice-bootstrap での apps/service/ 書込が素通り (exit $RC) <- fail-open"

# --- 7) protect-paths: 正規の feature ブランチは apps/service/ 可・acceptance/ 不可（従来動作の維持） ---
RC="$(run_hook protect-paths.sh "$REPO_OK" '{"tool_input":{"file_path":"'"$REPO_OK"'/apps/service/x.ts"}}')"
[[ "$RC" == "0" ]] \
  && pass "feature/slice-01 での apps/service/ 書込は allow (exit 0)" \
  || fail "feature/slice-01 での apps/service/ 書込が誤ブロック (exit $RC)"
RC="$(run_hook protect-paths.sh "$REPO_OK" '{"tool_input":{"file_path":"'"$REPO_OK"'/acceptance/x.spec.ts"}}')"
[[ "$RC" == "2" ]] \
  && pass "feature/slice-01 での acceptance/ 書込は block (exit 2)" \
  || fail "feature/slice-01 での acceptance/ 書込が素通り (exit $RC)"

rm -rf "$REPO_BOOT" "$REPO_OK" "$REPO_SFX" 2>/dev/null || true

echo
if [[ "$FAIL" == "0" ]]; then echo "PASS: all slice-branch-pattern hook tests"; exit 0
else echo "FAIL: slice-branch-pattern hook tests"; exit 1; fi
