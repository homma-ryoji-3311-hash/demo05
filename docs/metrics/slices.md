# スライス記録（プロセスKPI 生ログ）

`/submit` が1スライス完了ごとに1行追記する。集計方法とカラムの定義は同ディレクトリの `README.md` を参照。
**`救援有無` はリーダーが窓口対応時に埋める**（初級の自己申告に頼らない）。空欄は未記入を意味する。

| slice_id | 日付 | 救援有無(y/n) | 再作成回数 | 枠消費 | 差し戻し理由 | メンバー |
|---|---|---|---|---|---|---|
| slice-01 | 2026-07-16 |  | 0 | 未計測 | なし（Audit: GO-WITH-FIXES） | Honma218（Claude Opus 実装） |
| slice-02 | 2026-07-16 | y | 0 | 未計測 | なし（Audit: NO-GO だが帰責は上流の acceptance 欠陥。PR #12 で解消済み） | Honma218（Claude Opus 実装） |
| slice-03 | 2026-07-16 |  | 0 | 未計測 | なし（Audit: GO-WITH-FIXES・Major 4件） | Honma218（Claude Opus 実装） |
