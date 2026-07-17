#!/usr/bin/env bash
# hook 回帰テスト: 複合コマンドで main へ移動してから commit / push する経路を塞ぐ。
#
# 背景: hook は COMMITTABLE を「コマンド送信時のブランチ」で決める。したがって
#   作業ブランチ（feature/slice-NN・chore/*）から
#     git checkout main && git push
#   を1コマンドで投げると、判定時のブランチは作業ブランチのままなので COMMITTABLE=1 と
#   なり、**main への push が素通りする**。素の git push は PUSH_ARGS が空になるため
#   main/force/refspec のどのガードにも当たらず、upstream の main へ push される。
#   ＝CLAUDE.md §1-1「main を進める操作をしない」の絶対禁止を破れる。
#
#   従来この経路は「main への checkout」ガードが一律ブロックしていたため塞がっていた。
#   PR #31 が工程9b（/integrate Phase B 手順4「main を checkout し全スイート E2E」）の
#   ために素の checkout を許可した際、この偶然の保護が失われ fail-open が露出した。
#   PR #31 の Phase A 再検証で発見（マージ前）。
#
#   対策: 移動そのものは許可し、**移動と変更操作を同一コマンドに束ねること**を禁じる。
#   危険なのは移動ではなく束ねること。工程9b は素の checkout を単体で叩くため影響なし。
#   （docs/memory-bank/hook-defect-checkout-main-blocks-integrate-2026-07-17.md 参照）
#
# 依存なし（bats 不要）。失敗で非ゼロ終了する。実行:
#   bash .claude/hooks/tests/main-guard-compound-evasion.test.sh
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

rc() {
  local proj="$1" payload
  payload=$(python3 -c 'import json,sys; print(json.dumps({"tool_input":{"command":sys.argv[1]}}))' "$2")
  CLAUDE_PROJECT_DIR="$proj" bash "$HOOKS_DIR/pre-tool-use-bash.sh" <<<"$payload" >/dev/null 2>&1
  echo $?
}

echo "# 複合コマンドによる main ガードの回避"

for BR in chore/x feature/slice-01; do
  REPO="$(mkrepo "$BR")"
  echo
  echo "## 送信時ブランチ: $BR（COMMITTABLE=1）"

  # --- 1) 移動 ＋ 変更操作の束ね は禁止 ---
  for c in \
    'git checkout main && git commit --allow-empty -m x' \
    'git switch main && git commit -m x' \
    'git checkout main && git push' \
    'git checkout main && git commit -m x && git push' \
    'git checkout main; git push' \
    'git checkout master && git push'
  do
    r="$(rc "$REPO" "$c")"
    [[ "$r" == "2" ]] \
      && pass "[$c] は block (exit 2)" \
      || fail "[$c] が素通り (exit $r) <- main へ push できる"
  done

  # --- 2) 素の移動は許可（工程9b の前提。ここが崩れると /integrate Phase B が死ぬ） ---
  for c in \
    'git checkout main' \
    'git switch main' \
    'git checkout main && git log --oneline -3' \
    'git checkout main && git status'
  do
    r="$(rc "$REPO" "$c")"
    [[ "$r" == "0" ]] \
      && pass "[$c] は allow (exit 0)" \
      || fail "[$c] が誤ブロック (exit $r) <- 工程9b が実行できない"
  done

  # --- 3) 作業ブランチ間の移動＋commit は正当（誤検知しないこと） ---
  for c in \
    'git checkout feature/slice-02 && git commit -m x' \
    'git checkout -b feature/slice-09 origin/main && git commit -m x'
  do
    r="$(rc "$REPO" "$c")"
    [[ "$r" == "0" ]] \
      && pass "[$c] は allow (exit 0)" \
      || fail "[$c] が誤ブロック (exit $r) <- 日常操作が止まる"
  done

  rm -rf "$REPO" 2>/dev/null || true
done

echo
if [[ "$FAIL" == "0" ]]; then echo "PASS: all main-guard-compound-evasion hook tests"; exit 0
else echo "FAIL: main-guard-compound-evasion hook tests"; exit 1; fi
