# slice-01 report-draft — 報告の下書き作成・自動保存

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。
> **リーダー記入待ち: §4 固有注意・§6 slice 固有。**

## 1. ゴール

`POST /reports` で本文を伴う下書きを作成でき、`PATCH /reports/:id` で自動保存（下書きのまま更新）できる。確定済み報告への編集は 409、不正入力は 422 を返す。S3 業務報告入力で、明示の保存操作なしに本文が自動保存され、再訪時に復元表示される。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/reports/create.api.spec.ts` | backend |
| UI | `acceptance/reports/create.ui.spec.ts` | backend ＋ frontend |

- golden: 撮影可（未撮影・現状は `create.ui.spec.ts` の DOM アサーションで検証・ADR-0008/0018）
- 仕様表: `docs/spec/slice-01.md`（approved: true）
- AC: AC-1 作成（201・draft）／AC-2 自動保存（200・draft 維持）／AC-3 確定済み PATCH=409／AC-4 report_date 欠落=422

## 3. 触ってよいファイル範囲

- `apps/service/src/reports/`
  - `use-case/createDraft.ts` `use-case/updateDraft.ts` `use-case/getDraft.ts`
  - `domain/model/report.ts` `domain/interface/reportRepository.ts` `domain/error/reportErrors.ts`
  - `infra/repository/*ReportRepository.ts`
  - `interfaceAdapter/api/route/reportRoute.ts` `interfaceAdapter/api/controller/reportController.ts`・入力スキーマ（Zod/express-validator）
- `apps/web/src/features/reports/`（S3 業務報告入力・自動保存 UI）
- 上記範囲の unit テスト
- **範囲外**：`acceptance/` `reference-mock/` `docs/` `.claude/` ／ 認証（slice-06）／ 要約生成（slice-02）／ 確定（slice-03）／ DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-01 report-draft を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
バリデーション失敗（report_date 欠落等）は 422 で返す（Zod/express-validator のエラーハンドラで明示。500/400 は受け入れテストが赤）。自動保存は PATCH で status=draft を維持する。
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**`*.api.spec.ts` と `*.ui.spec.ts` の両方**（ADR-0018）
2. golden スクリーンショット差分が閾値内。**撮影不可のスライスは `*.ui.spec.ts` の DOM アサーションが緑**（ADR-0008・0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only` と突き合わせ）
4. シークレット・PII が出力・差分に無い

> 3 は「緑」と「指示書 §1 のゴール文」の乖離を検知するための判定である（ADR-0018）。
> 触らずに緑になったなら、**実装ではなくテストか指示書が間違っている**。上流へ返す。

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更
- 受け入れテスト・`reference-mock/`・`docs/` の変更（＝仕様と answer key）
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- slice-02（要約生成）/ slice-03（確定）/ slice-06（認証）の領域に着手しない
