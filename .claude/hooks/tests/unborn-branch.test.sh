#!/usr/bin/env bash
# hook 回帰テスト: 「コミット0件のリポジトリ（unborn branch）」での初回ブートストラップ。
#
# 背景: `git rev-parse --abbrev-ref HEAD` は unborn branch で stdout に "HEAD" を
#   出しつつ exit 128 する。旧実装 `$(... || echo 'unknown')` はこれを "HEAD\nunknown"
#   と壊れた値にし、feature/slice-00 にいるのに commit を誤ブロックしていた。
#   （docs/memory-bank/hook-defect-unborn-branch-2026-07-12.md 参照）
#
# 依存なし（bats 不要）。失敗で非ゼロ終了する。実行:
#   bash .claude/hooks/tests/unborn-branch.test.sh
set -uo pipefail

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0
pass() { echo "  ok   - $1"; }
fail() { echo "  FAIL - $1"; FAIL=1; }

# 一時 git リポジトリを作る。$1 = 初期ブランチ名（unborn のまま）
mkrepo() {
  local branch="$1" dir
  dir="$(mktemp -d)"
  git -C "$dir" init -q
  git -C "$dir" config user.email t@t
  git -C "$dir" config user.name t
  git -C "$dir" checkout -q -b "$branch" 2>/dev/null
  printf '%s' "$dir"
}

# hook を実行し exit code を返す。$1=hookファイル $2=CLAUDE_PROJECT_DIR $3=stdin(JSON)
run_hook() {
  local hook="$1" proj="$2" payload="$3"
  CLAUDE_PROJECT_DIR="$proj" bash "$HOOKS_DIR/$hook" <<<"$payload" >/dev/null 2>&1
  echo $?
}

echo "# unborn branch (コミット0件) の初回ブートストラップ"

# --- 1) current_branch() が unborn でも正しいブランチ名を返す ---
REPO="$(mkrepo feature/slice-00)"
CB="$(CLAUDE_PROJECT_DIR="$REPO" bash -c 'source "'"$HOOKS_DIR"'/lib.sh"; current_branch')"
[[ "$CB" == "feature/slice-00" ]] \
  && pass "current_branch() = feature/slice-00 (unborn)" \
  || fail "current_branch() が壊れている: got [$CB]"

# --- 2) 本丸: unborn の feature/slice-00 で git commit が通る（誤ブロックしない） ---
RC="$(run_hook pre-tool-use-bash.sh "$REPO" '{"tool_input":{"command":"git commit -m bootstrap"}}')"
[[ "$RC" == "0" ]] \
  && pass "unborn feature/slice-00 での git commit は allow (exit 0)" \
  || fail "unborn feature/slice-00 での git commit が誤ブロック (exit $RC) <- 回帰"

# --- 3) unborn の main では git commit がブロックされる（fail-closed 維持） ---
REPO_MAIN="$(mkrepo main)"
RC="$(run_hook pre-tool-use-bash.sh "$REPO_MAIN" '{"tool_input":{"command":"git commit -m x"}}')"
[[ "$RC" == "2" ]] \
  && pass "unborn main での git commit は block (exit 2)" \
  || fail "unborn main での git commit が素通り (exit $RC)"

# --- 4) protect-paths: detached HEAD で apps/service/ 書込が fail-closed でブロック ---
REPO_D="$(mkrepo feature/slice-00)"
( cd "$REPO_D" && echo x > a.txt && git add a.txt && git commit -qm first \
  && git checkout -q "$(git rev-parse HEAD)" ) 2>/dev/null   # detached HEAD
RC="$(run_hook protect-paths.sh "$REPO_D" '{"tool_input":{"file_path":"'"$REPO_D"'/apps/service/x.ts"}}')"
[[ "$RC" == "2" ]] \
  && pass "detached HEAD での apps/service/ 書込は block (exit 2)" \
  || fail "detached HEAD での apps/service/ 書込が素通り (exit $RC) <- fail-open"

rm -rf "$REPO" "$REPO_MAIN" "$REPO_D" 2>/dev/null || true

echo
if [[ "$FAIL" == "0" ]]; then echo "PASS: all unborn-branch hook tests"; exit 0
else echo "FAIL: unborn-branch hook tests"; exit 1; fi
