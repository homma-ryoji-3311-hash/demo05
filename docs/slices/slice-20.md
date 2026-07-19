# slice-20 wellbeing-soft-questions — ソフト設問・ウェルビーイング

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-20.md`（approved 2026-07-19）。依存: slice-19。フェーズ: 6。
> 振る舞いの正本: `spec.md §3.7`・`§6.2`・`phase2-design §4`。**雑感は L2（要配慮）＝最も厳格に扱う。**

## 1. ゴール

ソフト設問を役割で流し分ける：**AI活用**→スキル抽出（要約 skills へ反映）／**課題・所感**→内部の振り返り（シート非反映）／**雑感（メンタル面）**→ウェルビーイングとして後段へ渡さない。**雑感は `Summarizer` 抽象化層へ一切渡さず、AI 出力にもシートにも一切現れない**（完全除外・AC-2）。雑感は**任意入力・本人が非公開に設定可**（`zakkan_visibility`）で、閲覧は**最小ロール（本人・担当 manager・メンタルケア担当）**に限定、担当外・非公開は `403`（AC-3）。**AI は状態の診断・点数化をしない**（スコア・監視ダッシュボードを持たない・AC-4）。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/reports/wellbeing-soft.api.spec.ts` | backend |
| UI | `acceptance/reports/wellbeing-soft.ui.spec.ts` | **backend ＋ frontend** |

- golden: 入力フォームは可／雑感の非表示は DOM アサーション（共有ビューに雑感が出ないこと・ADR-0018）。
- 仕様表: `docs/spec/slice-20.md`（approved・AC-1〜4＋画面要件）
- AC: AC-1 役割別の流れ先／AC-2 雑感は AI・シートから完全除外／AC-3 閲覧最小ロール・非公開・403／AC-4 スコア化・診断なし
- オラクル parity: `tools/reference-mock-server/server.mjs`（`applySoftAnswersToSummary`・`assignedManagers`・`POST /reports/:id/soft-answers`・`GET /reports/:id/zakkan`・summarize 拡張）と HTTP 等価に。**雑感は要約・応答に一切出さない**・`403`（担当外/private）・スコア/診断フィールド無しを一致。

## 3. 触ってよいファイル範囲

- `apps/service/src/reports/`（既存 reports の拡張）
  - `domain/model/softAnswers.ts`（ソフト設問の役割別ルーティング。雑感は Summarizer へ渡さない・スコア化しない）
  - `use-case/saveSoftAnswers.ts`／`use-case/viewZakkan.ts`（閲覧最小ロール・private 判定）
  - `domain/interface/zakkanViewerPolicy.ts`（本人・担当 manager・メンタルケア担当の解決・cross-module。主/副の区別は slice-24）
  - `use-case/summarizeReport.ts`（**雑感を Summarizer 入力に含めない**・AI活用をスキルへ・課題/所感は非反映。既存の要約挙動は壊さない）
  - `interfaceAdapter/api/controller/reportController.ts`（soft-answers・zakkan のエンドポイント）
  - `interfaceAdapter/api/route/reportRoute.ts`
- `apps/service/src/app.ts`（zakkanViewerPolicy・assigned manager/mental_care の配線＋seed）
- `apps/web/src/features/reports/`（S3 設問部にソフト設問を足す・雑感を無権限ビューに出さない・スコア UI を持たない）
- 上記範囲の unit テスト
- **範囲外**：`apps/service` の他 feature／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／設問セット編集（slice-19）／主/副担当の区別・権限3軸（slice-24）

> 構造規約（ADR-0011）。**雑感（L2）は `Summarizer` seam の手前で遮断**（AI へ渡さない）・閲覧は use-case で最小ロール強制（private は本人のみ）・スコア/診断は生成しない。既存 summarize（slice-02）の挙動は soft_answers が無ければ不変。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-20 wellbeing-soft-questions を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「雑感(zakkan)は Summarizer へ一切渡さず要約・シート・応答のどこにも出さない（L2・完全除外）。AI活用→skills、課題/所感→内部非反映。閲覧は本人・担当manager・メンタルケア担当のみ、private は本人のみ、担当外は 403。スコア・診断・点数を一切生成しない。既存 summarize は soft_answers 無しで不変。オラクルと等価」>
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**`*.api.spec.ts` と `*.ui.spec.ts` の両方**（ADR-0018）
2. golden または **`*.ui.spec.ts` の DOM アサーションが緑**（雑感非表示・ADR-0008・0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only`）
4. シークレット・PII・**雑感実データ（L2）**が出力・差分に無い

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更
- 受け入れテスト・`reference-mock/`・`docs/` の変更
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- **雑感を AI 変換・シート反映・共有ビューに出すこと。** スコア化・診断・監視ダッシュボードを作ること。
- **雑感実データ（L2）を dev/テストに持ち込むこと**（合成のみ・憲法 §1-6/7）。
- **設問セット編集（slice-19）／主/副担当の区別・権限3軸（slice-24）に着手しない。**
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-19 question-template／slice-24 permission-model）>
```
