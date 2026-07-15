#!/usr/bin/env bash
# hook 回帰テスト: spec/* で acceptance/ を書くとき、仕様表の画面要件が空欄なら
#   approved: true でもブロックする（ADR-0018 / インシデント #2）。
#
# 背景: 「pixel 比較できない → UI 検証不要」の独断すり替えで frontend を1行も書かず
#   「受け入れテストが緑」で完了報告された。protect-paths.sh は approved:\s*true の
#   1行しか見ていなかった。画面要件セクションの記入まで機械で要求する。
#   （docs/adr/0018-acceptance-tests-must-verify-ui-layer.md 参照）
#
# 依存なし（bats 不要）。失敗で非ゼロ終了する。実行:
#   bash .claude/hooks/tests/spec-screen-requirement.test.sh
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
  mkdir -p "$dir/docs/spec" "$dir/acceptance"
  printf '%s' "$dir"
}

# 仕様表を書く。$1=repo $2=approved(true/false) $3=画面要件の種別(filled/none/placeholder/missing)
write_spec() {
  local dir="$1" approved="$2" kind="$3" f="$1/docs/spec/slice-01.md"
  {
    echo "---"
    echo "slice: slice-01-report-create"
    echo "approved: ${approved}"
    echo "---"
    echo
    echo "## AC-1 報告を1件保存できる"
    echo "- source: reference-mock"
    echo
    case "$kind" in
      filled)
        echo "## 画面要件（必須。「あれば」ではない・ADR-0018）"
        echo "- 対象画面: /reports の作成フォーム"
        echo "- golden 撮影の可否: 不可"
        echo "  - 縮退先: getByRole('button', {name: '保存'})"
        ;;
      none)
        echo "## 画面要件（必須。「あれば」ではない・ADR-0018）"
        echo "- 対象画面: 画面なし（バッチ処理のため）"
        ;;
      placeholder)
        echo "## 画面要件（必須。「あれば」ではない・ADR-0018）"
        echo "- 対象画面: <パス。無いなら「画面なし」＋理由>"
        echo "- golden 撮影の可否: 可 / 不可（どちらかを明記する）"
        ;;
      missing)
        : # 画面要件セクションを書かない
        ;;
    esac
  } > "$f"
}

run_hook() {
  local hook="$1" proj="$2" payload="$3"
  CLAUDE_PROJECT_DIR="$proj" bash "$HOOKS_DIR/$hook" <<<"$payload" >/dev/null 2>&1
  echo $?
}

# acceptance/ への書込を試みる payload
accept_payload() { echo '{"tool_input":{"file_path":"'"$1"'/acceptance/reports/create.api.spec.ts"}}'; }

echo "# 画面要件ガード（ADR-0018）"

# 1) approved + 画面要件が記入済み → acceptance/ 書込 allow
R="$(mkrepo spec/slice-01)"; write_spec "$R" true filled
RC="$(run_hook protect-paths.sh "$R" "$(accept_payload "$R")")"
[[ "$RC" == "0" ]] && pass "approved+画面要件記入済み → acceptance/ allow (exit 0)" \
                   || fail "approved+画面要件記入済みが誤ブロック (exit $RC)"
rm -rf "$R"

# 2) approved + 画面なし明記 → allow（免除経路）
R="$(mkrepo spec/slice-01)"; write_spec "$R" true none
RC="$(run_hook protect-paths.sh "$R" "$(accept_payload "$R")")"
[[ "$RC" == "0" ]] && pass "approved+「画面なし」明記 → acceptance/ allow (exit 0)" \
                   || fail "「画面なし」明記が誤ブロック (exit $RC)"
rm -rf "$R"

# 3) approved だが画面要件セクションが無い → block
R="$(mkrepo spec/slice-01)"; write_spec "$R" true missing
RC="$(run_hook protect-paths.sh "$R" "$(accept_payload "$R")")"
[[ "$RC" == "2" ]] && pass "approved+画面要件セクション欠落 → block (exit 2)" \
                   || fail "画面要件欠落が素通り (exit $RC) <- ADR-0018 の穴"
rm -rf "$R"

# 4) approved だがプレースホルダ '<...>' 残存 → block
R="$(mkrepo spec/slice-01)"; write_spec "$R" true placeholder
RC="$(run_hook protect-paths.sh "$R" "$(accept_payload "$R")")"
[[ "$RC" == "2" ]] && pass "approved+プレースホルダ残存 → block (exit 2)" \
                   || fail "プレースホルダ残存が素通り (exit $RC) <- ADR-0018 の穴"
rm -rf "$R"

# 5) approved: false → 従来どおり block（承認ゲート。画面要件チェックの前段）
R="$(mkrepo spec/slice-01)"; write_spec "$R" false filled
RC="$(run_hook protect-paths.sh "$R" "$(accept_payload "$R")")"
[[ "$RC" == "2" ]] && pass "approved: false → block (exit 2・従来動作維持)" \
                   || fail "未承認が素通り (exit $RC) <- ADR-0012 の回帰"
rm -rf "$R"

echo
if [[ "$FAIL" == "0" ]]; then echo "PASS: all spec-screen-requirement hook tests"; exit 0
else echo "FAIL: spec-screen-requirement hook tests"; exit 1; fi
