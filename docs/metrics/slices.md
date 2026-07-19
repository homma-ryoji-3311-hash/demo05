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
| slice-09 | 2026-07-19 |  | 0 | 未計測 | なし（Audit: GO・Minor 1＝vite.config の §3 配線列挙漏れ・逸脱でない）。工程6・方式B。api 7/7＋ui 3/3 緑（反転確認済）・unit 5/5・全73緑。PR #57 | Honma218（Claude Opus 実装） |
| slice-10 | 2026-07-19 |  | 0 | 未計測 | なし（Audit: GO・Minor 1＝prisma internal error 経路・未実行で影響なし）。工程6・方式B。Phase 2 完了スライス。api 6/6＋ui 2/2 緑（反転確認済）・unit 5/5・全78緑。user モデルに manager role＋group_id 追加（mgr01 seed の必然）。PR #58 | Honma218（Claude Opus 実装） |
| slice-27 | 2026-07-19 |  | 0 | 未計測 | regression-of-slice-10（ADR-0014 fix-forward）。slice-10 マージ後の工程9b で manage.ui の aria-label 二重マッチ（strict mode）を検出→1行修正。全 E2E 63/63 緑。incidents.md #1 に記録。PR #60（issue #59） | Honma218（Claude Opus 実装） |
| slice-11 | 2026-07-19 |  | 0 | 未計測 | なし（Audit: GO・Minor 1＝未要約 report の orphan 経路・AC 未到達で観測不能）。Phase 3 最初の実装。工程6・方式B。画面なし → api 4/4 緑・既存 reports 16/16（回帰なし）・unit 5/5・全83緑。confirm 拡張は projectLinker ポート＋app.ts 注入（no-cross-feature-import 回避）。PR #64（issue #63） | Honma218（Claude Opus 実装） |
| slice-12 | 2026-07-19 |  | 0 | 未計測 | なし（Audit: GO・Minor 1＝incident 対応づけの取り違え病的ケース→位置ベースに修正 commit 9d6c957）。工程6・方式B。画面なし → api 5/5 緑・既存 confirm/project-linking 回帰なし・unit 6/6・全89緑。confirm に突合追加は masterReconciler ポート＋app.ts 注入（ADR-0019 準拠・確定レスポンス拡張）。PR #70（issue #69） | Honma218（Claude Opus 実装） |
| slice-13 | 2026-07-19 |  | 0 | 未計測 | なし（Audit: GO・指摘0件）。**Phase 4 最初の下流実装。** 工程6・方式B。api 5/5＋ui 3/3 緑・既存 api 29/29 回帰なし・typecheck 両アプリ緑。TZ 往復（保存UTC/表示ローカル・18:00⇄09:00Z）はオラクル tzOffsetMin と算術一致。userTimezoneReader（auth 薄ラップ）＋vite proxy（/notification-settings）追加。上流は #71/#82 でマージ済。PR #94（issue #83） | Honma218（Claude Opus 実装） |
| slice-14 | 2026-07-19 |  | 0 | 未計測 | Audit: NO-GO だが帰責は上流 acceptance（admin-console.ui.spec の manager セッション欠落＝工程4 翻訳欠陥・slice-10 の mgr01 上書き失念）→ spec ブランチ #95 で修正（重量ゲート）。実装自体は GO 品質（API parity 完全・構造規約遵守・型健全）。api 4/4＋ui 3/3 緑（#95 適用時）・既存 api 29/29 回帰なし・typecheck 両アプリ緑。Audit Minor 1（?group 複数指定の非等価）→ 先頭採用に修正 a390b49。user モデルに groups?＋admin01 seed（parity 必然・slice-10 前例と同型）。PR #96（issue #84）・依存 #95 | Honma218（Claude Opus 実装） |
