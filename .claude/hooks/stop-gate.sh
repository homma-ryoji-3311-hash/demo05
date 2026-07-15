#!/usr/bin/env bash
# Stop: 「受け入れテスト未通過なら完了扱いにしない」ゲート。
# 注意: Stop hook は 8 連続ブロックで override される仕様＝上限付きゲート。
# 完了の最終担保はあくまで統合役の再検証（計画書 §6）。
#
# staff-report では受け入れテストは Vitest（API=integration / UI=acceptance）。
# /implement・/verify は JSON レポータで結果を残す:
#   pnpm --filter @staff-report/api test -- <対象> --reporter=default \
#     --reporter=json --outputFile=../../test-results/api-last-run.json
#   pnpm --filter @staff-report/web test -- <対象> --reporter=default \
#     --reporter=json --outputFile=../../test-results/ui-last-run.json
# （vitest の JSON 出力はルートに success: true/false を持つ）
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PAYLOAD="$(cat)"
ACTIVE="$(json_field "$PAYLOAD" "d.get('stop_hook_active')")"
# 既にこの hook 起因でループしている場合は素通しする（無限ループ防止）
[[ "$ACTIVE" == "True" || "$ACTIVE" == "true" ]] && exit 0

BRANCH="$(current_branch)"   # unborn/detached 安全（lib.sh）
# feature ブランチ以外（＝上流の作業）ではゲートしない
[[ "$(slice_branch_layer "$BRANCH")" == "feature" ]] || exit 0   # 番号必須（lib.sh）

API_RUN="${PROJECT_DIR}/test-results/api-last-run.json"
UI_RUN="${PROJECT_DIR}/test-results/ui-last-run.json"

if [[ ! -f "$API_RUN" ]]; then
  block "Stop" "STOP GATE: 受け入れテスト（API 層）の実行結果が見つかりません（test-results/api-last-run.json）。
完了を報告する前に、次を実行して生出力を提示してください:
  pnpm --filter @staff-report/api test -- <当該 *.integration.test.ts> \\
    --reporter=default --reporter=json --outputFile=../../test-results/api-last-run.json
UI の受入テストがあるスライスは web 側も同様に（ui-last-run.json）。
テストを実行せずに「できました」と報告しないこと（CLAUDE.md §2）。"
fi

API_OK="$(json_field "$(cat "$API_RUN")" "d.get('success')")"
if [[ "$API_OK" != "True" && "$API_OK" != "true" ]]; then
  block "Stop" "STOP GATE: 受け入れテスト（API 層）が緑ではありません（success=${API_OK:-unknown}）。
緑になるまで /implement のループを続けてください。
ただし次のいずれかに当たる場合は押し切らず停止して報告すること:
  - 同一エラーが2回出た → 5 Whys を書く
  - 同じテストを3回リトライして赤 → ハーネスのバグとして報告
  - 5ファイル以上変更した → 影響範囲を報告
（CLAUDE.md §3）"
fi

# UI 層は結果ファイルがある場合のみ判定する（画面なしスライスは仕様表に明記されている前提。
# 「UI テストを実行しない」ことでこのゲートは通れるが、判定2 と統合役の再検証で捕まる）。
if [[ -f "$UI_RUN" ]]; then
  UI_OK="$(json_field "$(cat "$UI_RUN")" "d.get('success')")"
  if [[ "$UI_OK" != "True" && "$UI_OK" != "true" ]]; then
    block "Stop" "STOP GATE: 受け入れテスト（UI 層）が緑ではありません（success=${UI_OK:-unknown}）。
apps/web の実装を直して緑にしてください（受け入れテスト自体は read-only）。"
  fi
fi

hook_log "Stop" "allow" "acceptance tests passed"
exit 0
