#!/usr/bin/env bash
# Stop: 「現スライスの受け入れテスト未通過なら完了扱いにしない」ゲート。
# 注意: Stop hook は 8 連続ブロックで override される仕様＝上限付きゲート。
# 完了の最終担保はあくまで統合役の runner 再検証（計画書 §6）。
#
# 2026-07-18 修正（chore/flywheel）: 2つの誤検知を塞ぐ。
#  (1) パス不一致: 受け入れは acceptance/ から走り、Playwright は testDir='.' + 既定 outputDir で
#      acceptance/test-results/ に .last-run.json を書く。旧実装は repo 直下 test-results/ を読み、
#      古い実行結果が残り続けて更新されない（無関係な failed を読み続ける）。実出力を読む。
#  (2) 全スイート汚染: full 実行だと未実装スライスの先置きテストが赤で status=failed になる。
#      現スライスが緑でも完了をブロックしてしまう。results.json（Playwright json レポータ）があれば
#      「現スライスの spec が赤か」だけで帰属判定する（ADR-0018: 完了条件は現スライスの緑）。
#      results.json が無ければ従来どおり保守的にブロック（回帰なし）。
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PAYLOAD="$(cat)"
ACTIVE="$(json_field "$PAYLOAD" "d.get('stop_hook_active')")"
# 既にこの hook 起因でループしている場合は素通しする（無限ループ防止）
[[ "$ACTIVE" == "True" || "$ACTIVE" == "true" ]] && exit 0

BRANCH="$(current_branch)"   # unborn/detached 安全（lib.sh）
# feature ブランチ以外（＝上流の作業）ではゲートしない
[[ "$(slice_branch_layer "$BRANCH")" == "feature" ]] || exit 0   # 番号必須（lib.sh）

# 受け入れの実出力を優先して読む（acceptance/test-results/）。無ければ repo 直下（後方互換）。
RESULTS_DIR="${PROJECT_DIR}/acceptance/test-results"
[[ -f "${RESULTS_DIR}/.last-run.json" ]] || RESULTS_DIR="${PROJECT_DIR}/test-results"
LAST_RUN="${RESULTS_DIR}/.last-run.json"
RESULTS_JSON="${RESULTS_DIR}/results.json"   # Playwright json レポータ（per-test・スコープ判定用）

if [[ ! -f "$LAST_RUN" ]]; then
  block "Stop" "STOP GATE: 受け入れテストの実行結果が見つかりません（${LAST_RUN#$PROJECT_DIR/}）。
完了を報告する前に、次を実行して生出力を提示してください:
  1. teamdev-test-runner の harness_start → ready 待ち
  2. 受け入れテストの実行（@playwright/test 等）
テストを実行せずに「できました」と報告しないこと（CLAUDE.md §2）。"
fi

STATUS="$(json_field "$(cat "$LAST_RUN")" "d.get('status')")"
if [[ "$STATUS" == "passed" ]]; then
  hook_log "Stop" "allow" "acceptance passed (${LAST_RUN#$PROJECT_DIR/})"
  exit 0
fi

# status != passed。可能なら「現スライスの spec が赤か」に限定して帰属判定する。
# 未実装スライスの先置きテスト（例: full 実行時の slice-05/07）の赤で完了を止めない（ADR-0018）。
SLICE="${BRANCH#feature/}"                          # feature/slice-06 → slice-06
INSTR="${PROJECT_DIR}/docs/slices/${SLICE}.md"
if [[ -f "$RESULTS_JSON" && -f "$INSTR" ]]; then
  # 指示書 §2 の受け入れ spec パス（acceptance/ を剥がして testDir 相対にそろえる）
  SLICE_SPECS="$(grep -oE 'acceptance/[A-Za-z0-9_./-]+\.spec\.ts' "$INSTR" | sed 's#^acceptance/##' | sort -u)"
  if [[ -n "$SLICE_SPECS" ]]; then
    OWN_FAILS="$(RESULTS_JSON="$RESULTS_JSON" SLICE_SPECS="$SLICE_SPECS" python3 - <<'PY'
import json, os, sys
specs = set(os.environ["SLICE_SPECS"].split())
bases = {os.path.basename(s) for s in specs}
try:
    rep = json.load(open(os.environ["RESULTS_JSON"], encoding="utf-8"))
except Exception:
    sys.exit(3)  # パース不能 → 呼び出し側は保守的に扱う（rc!=0）
own = set()
def visit(suite, f=None):
    f = suite.get("file", f)
    for spec in suite.get("specs", []):
        sf = spec.get("file", f) or f or ""
        if spec.get("ok") is False:
            if sf in specs or os.path.basename(sf) in bases:
                own.add(sf)
    for c in suite.get("suites", []):
        visit(c, f)
for s in rep.get("suites", []):
    visit(s)
print("\n".join(sorted(own)))
PY
)"
    if [[ $? -eq 0 ]]; then
      if [[ -z "$OWN_FAILS" ]]; then
        hook_log "Stop" "allow" "last run failed but current slice ($SLICE) specs passed; out-of-scope failures ignored"
        exit 0
      fi
      block "Stop" "STOP GATE: 現スライス（${SLICE}）の受け入れが赤です:
${OWN_FAILS}
緑になるまで /implement のループを続けてください。
ただし次のいずれかに当たる場合は押し切らず停止して報告すること:
  - 同一エラーが2回出た → 5 Whys を書く
  - 同じテストを3回リトライして赤 → ハーネスのバグとして報告
  - 5ファイル以上変更した → 影響範囲を報告
（CLAUDE.md §3）"
    fi
    # rc != 0（results.json パース不能）→ 下の保守的ブロックへフォールスルー
  fi
fi

# results.json でスコープできない → 従来どおり保守的にブロック（回帰なし）。
block "Stop" "STOP GATE: 受け入れテストが緑ではありません（status=${STATUS:-unknown}）。
緑になるまで /implement のループを続けてください。
ただし次のいずれかに当たる場合は押し切らず停止して報告すること:
  - 同一エラーが2回出た → 5 Whys を書く
  - 同じテストを3回リトライして赤 → ハーネスのバグとして報告
  - 5ファイル以上変更した → 影響範囲を報告
（CLAUDE.md §3）"
