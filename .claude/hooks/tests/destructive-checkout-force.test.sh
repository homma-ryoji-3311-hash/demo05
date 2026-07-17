#!/usr/bin/env bash
# hook 回帰テスト: checkout/switch の -f / --force は未コミットの作業を捨てる＝破壊的。
#
# 背景: pre-tool-use-bash.sh の「main への checkout」ガードは
#     git checkout <main|master>
#   という形しか見ていなかったため、
#     git checkout -f main
#   が素通りしていた（checkout の直後が -f で main ではないため正規表現に当たらない）。
#   結果、hook は「安全な移動」を止めて「未コミットの作業を捨てる操作」を通していた＝逆。
#   破壊的 git のガードにまとめ、対象ブランチを問わずブロックする。
#   （docs/memory-bank/hook-defect-checkout-main-blocks-integrate-2026-07-17.md 参照）
#
# 未了: 素の `git checkout main` のブロックは残っている（統合役の /integrate Phase B
#   手順4「main を checkout し全スイート E2E」と矛盾する）。緩和は権限境界の変更のため
#   人間が行う。本テストは素の checkout の挙動を assert しない——後で人が緩和を入れた
#   ときにテストがそれと戦わないようにするため。
#
# 依存なし（bats 不要）。失敗で非ゼロ終了する。実行:
#   bash .claude/hooks/tests/destructive-checkout-force.test.sh
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

cmd_rc() { run_hook pre-tool-use-bash.sh "$1" '{"tool_input":{"command":"'"$2"'"}}'; }

echo "# 強制 checkout / switch（未コミットの作業を捨てる）"

REPO="$(mkrepo feature/slice-01)"

# --- 1) 強制 checkout はブロックされる（対象ブランチを問わない） ---
for c in \
  "git checkout -f main" \
  "git checkout --force main" \
  "git switch -f main" \
  "git switch --force main" \
  "git switch --discard-changes main" \
  "git checkout -f feature/slice-02" \
  "git checkout -f"
do
  RC="$(cmd_rc "$REPO" "$c")"
  [[ "$RC" == "2" ]] \
    && pass "[$c] は block (exit 2)" \
    || fail "[$c] が素通り (exit $RC) <- 未コミットの作業を失う"
done

# --- 2) 誤検知しないこと（日常操作が止まらない） ---
for c in \
  "git checkout -b chore/x origin/main" \
  "git checkout -b feature/slice-09" \
  "git switch -c feature/slice-09" \
  "git checkout feature/slice-02" \
  "git status" \
  "git log --oneline -3"
do
  RC="$(cmd_rc "$REPO" "$c")"
  [[ "$RC" == "0" ]] \
    && pass "[$c] は allow (exit 0)" \
    || fail "[$c] が誤ブロック (exit $RC) <- 日常操作が止まる"
done

# --- 3) 既存の破壊的 git ガードが無傷であること ---
for c in \
  "git reset --hard origin/main" \
  "git clean -fd" \
  "git branch -D feature/slice-02" \
  "git checkout -- ."
do
  RC="$(cmd_rc "$REPO" "$c")"
  [[ "$RC" == "2" ]] \
    && pass "[$c] は依然 block (exit 2)" \
    || fail "[$c] が素通り (exit $RC) <- 回帰"
done

# --- 4) main の保護が無傷であること ---
REPO_MAIN="$(mkrepo main)"
RC="$(cmd_rc "$REPO_MAIN" "git commit -m x")"
[[ "$RC" == "2" ]] \
  && pass "main 上での git commit は依然 block (exit 2)" \
  || fail "main 上での git commit が素通り (exit $RC)"
RC="$(cmd_rc "$REPO_MAIN" "git push -u origin main")"
[[ "$RC" == "2" ]] \
  && pass "main 上での git push は依然 block (exit 2)" \
  || fail "main 上での git push が素通り (exit $RC)"
RC="$(run_hook protect-paths.sh "$REPO_MAIN" '{"tool_input":{"file_path":"'"$REPO_MAIN"'/apps/service/x.ts"}}')"
[[ "$RC" == "2" ]] \
  && pass "main 上での apps/service/ 書込は依然 block (exit 2)" \
  || fail "main 上での apps/service/ 書込が素通り (exit $RC)"

rm -rf "$REPO" "$REPO_MAIN" 2>/dev/null || true

echo
if [[ "$FAIL" == "0" ]]; then echo "PASS: all destructive-checkout-force hook tests"; exit 0
else echo "FAIL: destructive-checkout-force hook tests"; exit 1; fi
