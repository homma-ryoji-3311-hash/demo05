# slice-05 previous-reference — 前回入力・前回要約の参照

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。
> **リーダー記入待ち: §4 固有注意・§6 slice 固有。**

## 1. ゴール

`GET /reports/:id/previous` で直近の確定報告の本文と前回 AI 要約を読み取り専用で取得できる（200）。前回が存在しなければ `previous: null`（200）。S3 で前回本文・前回要約が控えめな読み取り専用表示で示され（丸写しを誘発しない）、無いときは「前回の報告はありません」等が表示される。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/reports/previous.api.spec.ts` | backend |
| UI | `acceptance/reports/previous.ui.spec.ts` | backend ＋ frontend |

- golden: 撮影可（未撮影・現状は `previous.ui.spec.ts` の DOM アサーションで検証・ADR-0008/0018）
- 仕様表: `docs/spec/slice-05.md`（approved: true）
- AC: AC-1 直近確定報告の本文＋前回要約を返す（200）／AC-2 前回なしは `previous: null`（200）

## 3. 触ってよいファイル範囲

- `apps/service/src/reports/`
  - `use-case/getPreviousReport.ts`
  - `domain/interface/reportRepository.ts`（前回参照の read）
  - `interfaceAdapter/api/route/reportRoute.ts` `interfaceAdapter/api/controller/reportController.ts`（GET /reports/:id/previous）
- `apps/web/src/features/reports/`（S3 前回参照の読み取り専用表示領域）
- 上記範囲の unit テスト
- **範囲外**：`acceptance/` `reference-mock/` `docs/` `.claude/` ／ 作成・更新（slice-01）／ 要約生成（slice-02）／ 確定（slice-03）／ 認証（slice-06）／ DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-05 previous-reference を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
読み取り専用（前回本文・前回要約を変更しない）。前回が無い場合は 200＋previous:null で返す（404 にしない）。
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
- slice-01（作成）/ slice-02（要約）/ slice-03（確定）の領域に着手しない
