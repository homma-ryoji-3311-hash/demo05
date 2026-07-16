# slice-03 report-confirm — 要約の確認・編集・確定

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。
> **リーダー記入待ち: §4 固有注意・§6 slice 固有。**

## 1. ゴール

`POST /reports/:id/confirm` で編集した要約を伴い報告を確定でき（200・confirmed）、確定後は本文・要約が不変（PATCH は 409）で、二重確定も 409。S4 で全項目が編集可能なフォームと「要確認」フラグ・元入力との照合が示され、確定後は編集不可の確定表示へ切り替わる。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/reports/confirm.api.spec.ts` | backend |
| UI | `acceptance/reports/confirm.ui.spec.ts` | backend ＋ frontend |

- golden: 撮影可（未撮影・現状は `confirm.ui.spec.ts` の DOM アサーションで検証・ADR-0008/0018）
- 仕様表: `docs/spec/slice-03.md`（approved: true）
- AC: AC-1 編集済み要約で確定（200・confirmed）／AC-2 確定後 PATCH=409（不変）／AC-3 二重確定=409

## 3. 触ってよいファイル範囲

- `apps/service/src/reports/`
  - `use-case/confirmReport.ts`
  - `domain/model/report.ts`（確定・不変化のドメイン規則）・`domain/error/reportErrors.ts`
  - `interfaceAdapter/api/route/reportRoute.ts` `interfaceAdapter/api/controller/reportController.ts`（confirm エンドポイント）
- `apps/web/src/features/reports/`（S4 確認・編集・確定 UI／確定表示への切替）
- 上記範囲の unit テスト
- **範囲外**：`acceptance/` `reference-mock/` `docs/` `.claude/` ／ 要約生成（slice-02）／ 一覧（slice-04）／ 認証（slice-06）／ DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-03 report-confirm を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
確定後の本文・要約は不変（PATCH・再確定は 409）。要約生成そのもの（slice-02）はここで作らない。
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
- slice-02（要約生成）/ slice-04（一覧）の領域に着手しない
