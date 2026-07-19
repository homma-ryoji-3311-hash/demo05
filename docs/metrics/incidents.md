# インシデント記録

単一アカウント/手続き的分離のまま進めた不可逆操作、および型の欠陥として残す事象を記録する（ADR-0015）。PM が事後確認する。revert 方針は fix-forward（ADR-0014）で、ここは「前例の記録」であって巻き戻しの指示ではない。

| # | 日付 | repo | 事象 | author | GO を出した帽子 | マージした帽子 | 扱い |
|---|---|---|---|---|---|---|---|
| 1 | 2026-07-19 | staff-report | slice-10 マージ後の工程9b（総合 E2E）で `manage.ui` フォームテストが赤。`TemplateManagePage` の `<ul aria-label="テンプレート版一覧">` が `getByLabel(/テンプレート\|アップロード\|ファイル/)` に file 入力と二重マッチ（strict mode 違反）。CI の test は unit のみで acceptance E2E 未実行のため工程9b でのみ検出（＝ADR-0010 の狙いどおり）。8/8 緑だったのは fetch 前にアサーションが走るレースだったため | Honma218（Claude Opus） | PM（層境ゲート・GO コメント #58） | 統合役（AI・自己承認ガード下で人 GO 後にマージ） | fix-forward: slice-27（regression-of-slice-10）で aria-label を1行修正・全 E2E 63/63 緑を確認（revert せず・ADR-0014） |
| 2 | 2026-07-19 | staff-report | slice-15（PR #98）マージ後の工程9b（総合 E2E）で slice-04 `reports/list.ui.spec` が赤。slice-15 が `/reports` に履行状況の `<ul role=list>` を追加したため、slice-04 の `getByRole('list')`（単一前提）が2 list に二重マッチ（strict mode 違反）。個別には slice-04・slice-15 とも緑だが結合後に赤（ADR-0010 の狙いどおり工程9b でのみ検出）。他 48 赤は slices 16-23 の未実装スイート＝想定内・回帰ではない | Honma218（Claude Opus） | PM（層境ゲート・GO コメント #98） | 統合役（AI・自己承認ガード下で人 GO 後にマージ） | fix-forward: slice-28（regression-of-slice-15）で履行状況を非 list 要素に変更・slice-04 2/2＋slice-15 8/8 緑・01-15 回帰ゼロ（96 passed/48 failed=16-23 のみ）を確認（revert せず・ADR-0014） |
