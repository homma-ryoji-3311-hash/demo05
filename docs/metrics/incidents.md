# インシデント記録

単一アカウント/手続き的分離のまま進めた不可逆操作、および型の欠陥として残す事象を記録する（ADR-0015）。PM が事後確認する。revert 方針は fix-forward（ADR-0014）で、ここは「前例の記録」であって巻き戻しの指示ではない。

| # | 日付 | repo | 事象 | author | GO を出した帽子 | マージした帽子 | 扱い |
|---|---|---|---|---|---|---|---|
| 1 | 2026-07-19 | staff-report | slice-10 マージ後の工程9b（総合 E2E）で `manage.ui` フォームテストが赤。`TemplateManagePage` の `<ul aria-label="テンプレート版一覧">` が `getByLabel(/テンプレート\|アップロード\|ファイル/)` に file 入力と二重マッチ（strict mode 違反）。CI の test は unit のみで acceptance E2E 未実行のため工程9b でのみ検出（＝ADR-0010 の狙いどおり）。8/8 緑だったのは fetch 前にアサーションが走るレースだったため | Honma218（Claude Opus） | PM（層境ゲート・GO コメント #58） | 統合役（AI・自己承認ガード下で人 GO 後にマージ） | fix-forward: slice-27（regression-of-slice-10）で aria-label を1行修正・全 E2E 63/63 緑を確認（revert せず・ADR-0014） |
