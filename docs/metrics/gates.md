# 層境ゲート判定ログ

全 PR の層境ゲート判定（GO/NO-GO）の記録場所（ADR-0007・playbook 工程8）。
**代理判定（リーダー）は記録必須**——「仕様が PM の承認なしに main に入りうる」ため、PM が事後にこの表を確認する。
PM 本人の判定も1行残す（監査証跡の一貫性のため）。所有は Harness-Keeper（AIアーキ）。

## 記録フォーマット（1判定＝1行）

| PR | slice_id | 日付 | ゲート重量 | 判定 | 判定者 | PM事後確認 | 根拠（1行） |
|---|---|---|---|---|---|---|---|
| #98 | slice-15 | 2026-07-19 | 軽（docs/service/web・irreversible なし） | GO | PM（本人・工程8） | — | Audit GO-WITH-FIXES。Major 1=`report-status/` dir の §3 空振り→consolidation 追認（reports/ 集約が仕様表画面要件「専用画面 新設せず /reports 表示」を満たす正当な読み・§3 当該行は後日 spec 修正）。再検証 8/8 緑・秘密なし・範囲外リークなし |
| #100 | slice-28 | 2026-07-19 | 軽（web/docs・irreversible なし） | GO | PM（本人・工程8） | — | 回帰 fix-forward（regression-of-slice-15・ADR-0014）。slice-15 マージ後の工程9b で slice-04 `list.ui` が list role 二重マッチで赤→履行状況を非 list 要素化。slice-04 2/2＋slice-15 8/8 緑・総合 96/48（16-23 未実装のみ）・01-15 回帰ゼロ・typecheck緑・CI 全緑。acceptance 不変 |
| #43 | —（flywheel 草案③④） | 2026-07-20 | 軽（docs/.claude/skills・irreversible なし） | GO | PM（本人・工程8） | — | 工程10 書き戻しの宣言実装。工程7 再検証＝docs/skills のみ・秘密なし・スコープ逸脱なし・CI 3緑・main と衝突なし（SKILL.md/_template.md は merge-base 以降 main 不変）。内容: §3 合成ルート除外を `_template.md` に固定＋`/pickup` を `origin/main` 基点に更新＋pending 2本（CLAUDE.md 不変更）。§3 合成ルート問題は多スライス再発の 2ストライク超。マージ dc09dae・main CI success |
| #102 | —（flywheel 工程10） | 2026-07-20 | 軽（docs のみ・irreversible なし） | GO | PM（本人・工程8） | — | ADR-0020 草案（共有ページのセレクタは親スコープで限定）＋CLAUDE.md §6 昇格候補＋#43 gate 記録。中身は memory-bank 隔離のみで CLAUDE.md/acceptance 不変更。回帰2件（slice-10→27・slice-15→28）の 2ストライクを宣言化。CI 2緑・MERGEABLE/CLEAN。マージ 0b72a7a |
| #27 | —（flywheel 草案） | 2026-07-20 | 軽（docs のみ・irreversible なし） | GO | PM（本人・工程8） | — | 工程4 欠陥6/7・Stop hook 矛盾・完了定義に typecheck の pending 3本（CLAUDE.md 不変更）。docs/memory-bank のみ・秘密なし・CI 3緑。2026-07-17 起票の草案を工程10 で確定。マージ 247d45e |
| #44 | —（flywheel①堅牢化） | 2026-07-20 | **重（acceptance/ 変更・§7 PM が diff 実読）** | GO | PM（本人・工程8・diff 実読済） | — | `acceptance/playwright.config.ts` に json レポータ（`test-results/results.json`）を **追加のみ**。spec/base URL/projects/アサーション不変＝テスト意味論を変えない runner インフラ。head は spec/slice-01＝§1.3 準拠（acceptance は spec/* から変更可）。stop-gate 帰属判定の実行時強制。CI 全スイート緑（lint/test/typecheck）。マージ 188abd6 |
