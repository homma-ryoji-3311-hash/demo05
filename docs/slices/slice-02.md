# slice-02 report-summarize — AI要約（Summarizer 抽象化層）

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。
> **リーダー記入待ち: §4 固有注意・§6 slice 固有。**

## 1. ゴール

`POST /reports/:id/summarize` で下書き本文を要約し、固定スキーマ（incidents/achievements/issues/skills の4キーのみ）の構造化 JSON を `Summarizer` 抽象化層（提供元非依存）経由で返す。本文にない数値・事実は創作しない。要約失敗は 502 を返し下書きは失われない。S4 で4カテゴリ結果が表示され、要約中・失敗の状態がテキストで示される。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/reports/summarize.api.spec.ts` | backend |
| UI | `acceptance/reports/summarize.ui.spec.ts` | backend ＋ frontend |

- golden: 撮影可（未撮影・現状は `summarize.ui.spec.ts` の DOM アサーションで検証・ADR-0008/0018）
- 仕様表: `docs/spec/slice-02.md`（approved: true）
- AC: AC-1 4カテゴリ JSON（200）／AC-2 固定スキーマ（4キーのみ）／AC-3 数値創作なし／AC-4 失敗は 502・draft 維持

## 3. 触ってよいファイル範囲

- `apps/service/src/reports/`
  - `use-case/summarizeReport.ts`
  - `domain/interface/summarizer.ts`・`infra/summarizer/*Summarizer.ts`（フェイク実装・提供元非依存の seam）
  - `interfaceAdapter/api/route/reportRoute.ts` `interfaceAdapter/api/controller/reportController.ts`（summarize エンドポイント）
- `apps/web/src/features/reports/`（S4 要約結果の表示・状態表示）
- 上記範囲の unit テスト
- **範囲外**：`acceptance/` `reference-mock/` `docs/` `.claude/` ／ 実プロバイダ鍵（`.env` のみ）／ 確定（slice-03）／ 一覧（slice-04）／ 認証（slice-06）／ DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-02 report-summarize を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
Summarizer 失敗は 502 を返し下書きは draft のまま保持する。出力は 4キー固定（余剰キー禁止）・本文に無い数値は出さない。要約は必ず Summarizer 抽象化層経由（プロバイダ直呼び禁止）。
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
- slice-01（作成/更新）/ slice-03（確定）の領域に着手しない
