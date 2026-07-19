# slice-12 reconcile-master — 突合・増分マージによるマスター元データ更新

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-12.md`（approved）。依存: slice-11。フェーズ: 3。

## 1. ゴール

報告確定 `POST /reports/:id/confirm` の**同一処理内で同期的に突合を実行**し（AC-5）、確定レスポンスに `master_summaries: [{user_id, project_id, period, summary, reconciled_at}]` を加える（ADR-0019）。突合は案件（slice-11 の project_id）×期間（`report_date` の `YYYY-MM`）で MASTER_SUMMARIES を **upsert**（`(user_id, project_id, period)` で重複行なし・冪等）、`summary.incidents` は incident `key` で dedup し**最新 status に上書き**（追記でない）、既存マスターに**新報告のみをマージ**（全再処理でない）。**生報告ログ（REPORTS）は不変**で、更新はマスター側にのみ起きる。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/reports/reconcile-master.api.spec.ts` | backend |
| UI | **なし（画面なし）** | — |

- golden: **撮影不可（画面なし）**。完了判定は API 受け入れテスト（実 HTTP）が緑（ADR-0018）。
- 仕様表: `docs/spec/slice-12.md`（approved・「HTTP 契約」節が正本・ADR-0019 準拠）
- AC: AC-1 増分マージ ／ AC-2 incident key で最新上書き ／ AC-3 生報告ログ不変 ／ AC-4 `(user,project,period)` 冪等 upsert ／ AC-5 確定同期
- オラクル parity: `tools/reference-mock-server/server.mjs`（confirm の突合・`masterSummaries` upsert・period 導出）と HTTP 等価に。

> 画面なしは仕様表 §画面要件に理由つき明記済み。§3 に `apps/web/` は挙げない（ADR-0018）。

## 3. 触ってよいファイル範囲

- `apps/service/src/master-summaries/`（新規モジュール）
  - `domain/model/masterSummary.ts`（MasterSummary エンティティ・incident を `key` で dedup し最新 status に上書きするマージ）
  - `domain/interface/masterSummaryRepository.ts`（`(user_id, project_id, period)` の upsert/find ポート）
  - `infra/repository/{inMemory,prisma}MasterSummaryRepository.ts`（実装・prisma はモデル未マイグレーションのため未配線 throw）
  - `use-case/reconcileMaster.ts`（増分マージ→upsert→`master_summaries` を返す。period=`report_date` の `YYYY-MM`）
- `apps/service/src/reports/use-case/confirmReport.ts`（slice-11 の紐づけに続けて突合を呼ぶ。`ConfirmResult` に `masterSummaries` を追加。既存挙動は不変）
- `apps/service/src/reports/domain/interface/masterReconciler.ts`（**ポート**。projects と同じく `no-cross-feature-import` を避け、master-summaries の use-case を app.ts で注入）
- `apps/service/src/reports/interfaceAdapter/api/controller/reportController.ts`（confirm レスポンスに `master_summaries` を含める）
- `apps/service/src/app.ts`（`reconcileMaster` の合成＋`masterSummaryRepository` 配線＋reconciler ポートの adapter）
- 上記範囲の unit テスト
- **範囲外**：`apps/web/`（画面なし）／**slice-08 の masters（非更新・独立レイヤー）**／projects・auth・skillsheets・templates 本体／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション

> 構造規約（ADR-0011）: `router → controller → use-case → repository` の一方向。confirm use-case は masterReconciler ポート経由で master-summaries を呼ぶ（slice-11 の projectLinker と同型・app.ts で注入）。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-12 reconcile-master を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります（api.spec.ts のみ・画面なし）。
  まず現状の赤を確認してください（当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
突合は確定の同一処理内で同期実行し、確定レスポンスに master_summaries を足す（ADR-0019・新エンドポイントを作らない）。upsert キーは (user_id, project_id, period)＝重複行を作らない（AC-4）。period は report_date の YYYY-MM。incident は key で dedup し最新 status に上書き（追記でない・AC-2）。既存マスターに新報告のみをマージ（全再処理でない・AC-1）。生報告ログ（REPORTS）は書き換えず、master_summaries は rep に保存しない（別レイヤー・AC-3）。slice-08 の masters は更新しない（独立レイヤー）。confirm の既存挙動（summary フォールバック・確定後不変・二重確定409・slice-11 の紐づけ）を壊さない。オラクル server.mjs の突合と HTTP 等価に（レスポンスキー・period・upsert）。
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**画面なしのため `*.api.spec.ts` のみ**（ADR-0018）
2. 画面なし → golden 該当なし（完了判定①で代替）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only` と突き合わせ）
4. シークレット・PII が出力・差分に無い

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更（特に `apps/web/`＝画面なし）
- 受け入れテスト・`reference-mock/`・`docs/` の変更
- **confirm(slice-03)・紐づけ(slice-11) の既存挙動を壊すこと**（summary フォールバック・確定後不変・二重確定409・projects/incidents）
- **slice-08 の masters（スキルシート入力）を更新すること**（本スライスは MASTER_SUMMARIES を独立レイヤーで upsert のみ）
- **突合結果を report(REPORTS) に保存すること**（AC-3・生報告ログ不変。master_summaries はレスポンスにのみ含める）
- projects・auth・skillsheets・templates 本体、後続（slice-13 以降）への着手
