# slice-11 project-linking — 確定時の案件キー紐づけと INCIDENTS ステータス

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-11.md`（approved）。依存: slice-03（確定）。フェーズ: 3。

## 1. ゴール

報告確定 `POST /reports/:id/confirm` を拡張し、リクエストの `projects`（対応案件・案件ごとに `incidents` をネスト）を受けて、**案件キーで既存案件へ紐づけ／未知キーは新規案件を作成**（同一ユーザー内 `(user_id, project_key)` で重複作成しない）、INCIDENTS の status（`発生`/`対応中`/`解決`）を案件へ保存する。レスポンスは従来 report ＋ `projects:[{id, project_key, client_name, status}]` ＋ `incidents:[{project_id, status}]`。不正な incident status は `422`（部分適用なし＝原子性）。突合（slice-12）を決定的にする土台。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/reports/project-linking.api.spec.ts` | backend |
| UI | **なし（画面なし）** | — |

- golden: **撮影不可（画面なし）**。完了判定は API 受け入れテスト（実 HTTP）が緑（ADR-0018）。
- 仕様表: `docs/spec/slice-11.md`（approved・「HTTP 契約」節が正本）
- AC: AC-1 既存案件へ紐づけ ／ AC-2 incident status 保存 ／ AC-3 未知キー新規＋dedup ／ AC-4 不正 status は 422（原子性）
- オラクル parity: `tools/reference-mock-server/server.mjs`（`p_seed`・`resolveProject`・confirm 拡張）と HTTP 等価に。

> 画面なしは仕様表 §画面要件に理由つき明記済み（サーバ内処理・独立画面なし）。§3 に `apps/web/` は挙げない（ADR-0018）。

## 3. 触ってよいファイル範囲

- `apps/service/src/projects/`（新規モジュール）
  - `domain/model/project.ts`（Project／Incident・案件キー／status のドメイン検証。不正 status は 422＝ドメインエラー）
  - `domain/interface/projectRepository.ts`（案件の保存・`(user_id, project_key)` 解決・紐づけの read/write ポート）
  - `infra/repository/{inMemory,prisma}ProjectRepository.ts`（実装＋seed `p_seed`＝オラクル parity・prisma はモデル未マイグレーションのため未配線 throw）
  - `use-case/linkReportProjects.ts`（確定時の案件紐づけを編成: 既存/新規解決→incident 保存→紐づけ返却）
- `apps/service/src/reports/use-case/confirmReport.ts`（confirm を拡張: `projects` を受け取り linkReportProjects を呼ぶ。summary の既存挙動は不変）
- `apps/service/src/reports/interfaceAdapter/api/controller/reportController.ts`（confirm が `body.projects` を渡し、レスポンスに `projects`/`incidents` を含める）
- `apps/service/src/app.ts`（`projectRepository` 配線＋seed）
- 上記範囲の unit テスト
- **範囲外**：`apps/web/`（画面なし）／skillsheets・templates・auth 本体／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション

> 構造規約（ADR-0011）: `router → controller → use-case → repository` の一方向。reports の confirm use-case が projects ポートに依存する（home→reports read ポートと同型の cross-module 依存・app.ts で配線）。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-11 project-linking を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります（api.spec.ts のみ・画面なし）。
  まず現状の赤を確認してください（当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
案件キーの解決は (user_id, project_key)。他ユーザーの同名キーと混同しない（deny-by-default）。不正な incident status（発生/対応中/解決 以外）は 422 で、案件作成・紐づけ・incident 保存のいずれも残さない（原子性）。オラクル server.mjs（p_seed / confirm 拡張）と HTTP 等価に：レスポンスキー（projects/incidents）・status 値・既存キーは同一 project id を再利用（重複作成しない）。summary の既存挙動（フォールバック・確定後不変・二重確定 409）は壊さない。
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
- **確定(slice-03)の既存挙動（summary フォールバック・確定後不変・二重確定409）を壊すこと**
- reports 本体の他機能・auth 本体・skillsheets・templates への着手
- **slice-12 reconcile-master（突合の後段・依存 slice-11）に着手しない。** MASTER_SUMMARIES / 増分マージ / 再要約は slice-12 の仕事。本スライスは「案件キーで紐づけ、INCIDENTS 状態を保存する」までで止める（突合＝状態の上書きマージは行わない）。
