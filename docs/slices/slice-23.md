# slice-23 ai-follow-up-question — AI 追加質問

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-23.md`（approved 2026-07-19）。依存: slice-03・slice-22。フェーズ: 6。画面: S4 拡張。
> 振る舞いの正本: `report-quality-design.md`（特に §2 フロー・§3 粒度判定・§5 回答・§6 必須/任意・§10 degrade）。**【決定】のみ AC 化・【未決】は slice-26 へ段階送り。**

## 1. ゴール

要約後、**管理者が選んだ対象カテゴリの薄い項目**（ルール検出＝決定的・空/極端に短い）へ **一度だけ**追加質問を生成・提示する（`POST /reports/:id/follow-up`・Gemini 自動判定は主役にしない・AC-1）。**回答は本文（`raw_text`）へ追記して要約（`ai_summary_json`）を作り直す**（下書きのまま・確定済みは不変・AC-2）。**必須の追加質問が未回答なら確定をブロック**（`422`）、**任意はスキップして確定可**（AC-3）。**質問自体が出せなかった degrade 時は必須ブロックを発動しない**（「問われていない」を確定不能にしない・AC-4）。**対話は一度きりで二重質問しない**（AC-5）。S4 AI要約 確認・編集 の拡張に差し込む。
> **段階送り（slice-26 へ）**: しきい値・無内容語の精緻化／生成質問と定型質問の優先順位・上限／基準の解決順／データモデル精緻化／degrade 詳細・再来訪 UI。本スライスは中核（AC-1〜5）のみ。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/reports/ai-follow-up.api.spec.ts` | backend |
| UI | `acceptance/reports/ai-follow-up.ui.spec.ts` | **backend ＋ frontend** |

- golden: 基本フローは可／**再来訪 UI は slice-26 へ段階送りのため golden 対象外**（DOM アサーションで検証・ADR-0018）。
- 仕様表: `docs/spec/slice-23.md`（approved・AC-1〜5＋画面要件）
- AC: AC-1 薄い項目へ一度だけ質問（決定的）／AC-2 回答を本文追記・要約作り直し（draft）／AC-3 必須ブロック・任意スキップ／AC-4 degrade は非ブロック／AC-5 二重質問しない
- オラクル parity: `tools/reference-mock-server/server.mjs`（`isThin`・`POST /reports/:id/follow-up`・`/follow-up/answer`・confirm の必須ブロック）と HTTP 等価に。`follow_up.state`（`asked`/`answered`/`degraded`/`not_needed`）・`422`（必須未回答）・回答追記/再要約を一致。**しきい値・対象カテゴリは仮値**（実装時に置き slice-26 で精緻化）。

## 3. 触ってよいファイル範囲

- `apps/service/src/reports/`（既存 reports の拡張）
  - `domain/model/followUp.ts`（薄さのルール検出〔決定的〕・質問状態 asked/answered/degraded/not_needed・必須/任意・一度きり）
  - `use-case/requestFollowUp.ts`（要約後に薄い項目を検出→一度だけ質問生成・degrade 判定・二重質問防止）
  - `use-case/answerFollowUp.ts`（回答を raw_text へ追記→要約作り直し・下書きのまま）
  - `use-case/confirmReport.ts`（**確定時に「必須の追加質問が提示済みかつ未回答」なら 422 ブロック**・任意/回答済み/degrade は通す。既存の確定挙動・案件紐づけ・突合は壊さない）
  - `interfaceAdapter/api/controller/reportController.ts`（follow-up / answer エンドポイント）／`interfaceAdapter/api/route/reportRoute.ts`
- `apps/service/src/app.ts`（配線。対象カテゴリ・しきい値は設定値として注入＝slice-26 で調整可能に）
- `apps/web/src/features/reports/routes/ReportReviewPage.tsx`（S4 確認画面に追加質問の提示・回答入力・必須未回答時の確定無効化＋理由テキストを足す）
- 上記範囲の unit テスト
- **範囲外**：他 feature／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／**しきい値・優先順位・データモデル・degrade 詳細・再来訪 UI の精緻化（slice-26）／グループ別基準の解決（slice-22 の設定駆動基盤は利用するが基準解決順の正式定義は slice-26）**

> 構造規約（ADR-0011）: `router → controller → use-case → repository`。**薄さ判定はルール検出（決定的）が主役**（Gemini 自動判定を薄さ判定の主役にしない）。**必須ブロックは「提示されたのに未回答」時に限る**（degrade＝未提示では発動しない）。回答は確定前のみ本文へ追記し要約を作り直す（確定済みは不変・原則6）。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-23 ai-follow-up-question を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「薄さはルール検出（決定的・対象カテゴリ/最小文字数は仮値でゆるめ・slice-26で調整）。一度だけ・二重質問しない。回答は raw_text へ追記し要約を作り直す（確定前のみ・draft のまま）。必須ブロックは『提示されたのに未回答』時に限り 422、任意はスキップ可、degrade（未提示）は非ブロック。既存の確定(slice-03)・案件紐づけ(slice-11)・突合(slice-12)を壊さない。オラクルと等価」>
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**`*.api.spec.ts` と `*.ui.spec.ts` の両方**（ADR-0018）
2. golden（基本フロー）または **`*.ui.spec.ts` の DOM アサーションが緑**（ADR-0008・0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only`）
4. シークレット・PII が出力・差分に無い

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更
- 受け入れテスト・`reference-mock/`・`docs/` の変更
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- **中核の骨格を崩すこと**: 薄さ判定の主役をルール検出から Gemini へ移す／二重質問する／回答を確定済み報告へ追記する／必須ブロックを degrade（未提示）でも発動する。
- **しきい値・優先順位・データモデル・degrade 詳細・再来訪 UI の精緻化（slice-26）に着手しない。**
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-26 ai-followup-advanced／slice-20 wellbeing）>
```
