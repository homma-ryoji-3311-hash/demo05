# スライス記録（プロセスKPI 生ログ）

`/submit` が1スライス完了ごとに1行追記する。集計方法とカラムの定義は同ディレクトリの `README.md` を参照。
**`救援有無` はリーダーが窓口対応時に埋める**（初級の自己申告に頼らない）。空欄は未記入を意味する。

| slice_id | 日付 | 救援有無(y/n) | 再作成回数 | 枠消費 | 差し戻し理由 | メンバー |
|---|---|---|---|---|---|---|
| slice-01 | 2026-07-16 |  | 0 | 未計測 | なし（Audit: GO-WITH-FIXES） | Honma218（Claude Opus 実装） |
| slice-02 | 2026-07-16 | y | 0 | 未計測 | なし（Audit: NO-GO だが帰責は上流の acceptance 欠陥。PR #12 で解消済み） | Honma218（Claude Opus 実装） |
| slice-03 | 2026-07-16 |  | 0 | 未計測 | なし（Audit: GO-WITH-FIXES・Major 4件。M-1 は工程6 で修正。M-2/M-3/M-4 は帰責が上流の acceptance 欠陥 → #19 へ差し戻し） | Honma218（Claude Opus 実装） |
| slice-06 | 2026-07-18 |  | 0 | 未計測 | なし（Audit: NO-GO → Critical C-7「summarize/confirm の認可欠落」を工程6 で修正 commit beb9347。ブランチが slice-04 前 main 由来のため merge で #28 取り込み・環境ロックで rebase 不可） | Honma218（Claude Opus 実装） |
| slice-07 | 2026-07-18 |  | 0 | 未計測 | なし（Audit: GO・指摘 0件）。confirmed 分岐が slice-03 confirm の非準拠に依存 → fix-forward #45(PR #46) を起票・実装・マージ後に main を merge し 6/6 緑 | Honma218（Claude Opus 実装） |
| slice-05 | 2026-07-18 |  | 0 | 未計測 | なし（Audit: GO・指摘 0件）。現 main からゼロ実装（旧 PR #22 は superseded）。実装中に slice-02 summarize.ui の並列フレークを診断（単独/直列 26/26 緑・slice-05 回帰でないと確認） | Honma218（Claude Opus 実装） |
| slice-08 | 2026-07-19 |  | 0 | 未計測 | なし（Audit: GO・指摘 0件）。工程6・方式B ゼロ実装。画面なし → api 6/6 緑・unit 5/5・全68緑。PR #56 | Honma218（Claude Opus 実装） |
