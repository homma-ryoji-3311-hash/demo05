# 層境ゲート判定ログ

全 PR の層境ゲート判定（GO/NO-GO）の記録場所（ADR-0007・playbook 工程8）。
**代理判定（リーダー）は記録必須**——「仕様が PM の承認なしに main に入りうる」ため、PM が事後にこの表を確認する。
PM 本人の判定も1行残す（監査証跡の一貫性のため）。所有は Harness-Keeper（AIアーキ）。

## 記録フォーマット（1判定＝1行）

| PR | slice_id | 日付 | ゲート重量 | 判定 | 判定者 | PM事後確認 | 根拠（1行） |
|---|---|---|---|---|---|---|---|
| #98 | slice-15 | 2026-07-19 | 軽（docs/service/web・irreversible なし） | GO | PM（本人・工程8） | — | Audit GO-WITH-FIXES。Major 1=`report-status/` dir の §3 空振り→consolidation 追認（reports/ 集約が仕様表画面要件「専用画面 新設せず /reports 表示」を満たす正当な読み・§3 当該行は後日 spec 修正）。再検証 8/8 緑・秘密なし・範囲外リークなし |
| #100 | slice-28 | 2026-07-19 | 軽（web/docs・irreversible なし） | GO | PM（本人・工程8） | — | 回帰 fix-forward（regression-of-slice-15・ADR-0014）。slice-15 マージ後の工程9b で slice-04 `list.ui` が list role 二重マッチで赤→履行状況を非 list 要素化。slice-04 2/2＋slice-15 8/8 緑・総合 96/48（16-23 未実装のみ）・01-15 回帰ゼロ・typecheck緑・CI 全緑。acceptance 不変 |
