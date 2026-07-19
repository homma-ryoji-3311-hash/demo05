# slice-19 question-template-editor — 設問テンプレート編集

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-19.md`（approved 2026-07-19）。依存: slice-17。フェーズ: 6。画面: S10。
> 振る舞いの正本: `reference-mock/spec.md §3.6`。REST は設計（overview §3 `/question-sets`）。

## 1. ゴール

manager がグループ単位で設問セットを作成・編集・並べ替えできる（`POST`/`PUT /question-sets`・取得で同じ順序）。各設問は回答形式（短文/長文/選択）・必須/任意・役割タグ（案件キー紐づけ/ステータス/スキル抽出/内部のみ）を保持する。公開（`POST /question-sets/:id/publish`）時に**ガードレール**が必須役割（案件キー紐づけ≥1・スキル抽出≥1）不足を検出し、不足役割を明示して**公開を拒否**（`422`・公開状態に遷移しない）。**版管理**で過去報告を壊さない（新版公開後も過去 published 版は不変）。S10 設問テンプレート編集画面を提供。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/questions/question-template.api.spec.ts` | backend |
| UI | `acceptance/questions/question-template.ui.spec.ts` | **backend ＋ frontend** |

- golden: 撮影不可（参照モックに S10 画面なし）→ `*.ui.spec.ts` の DOM アサーション（ADR-0018）。
- 仕様表: `docs/spec/slice-19.md`（approved・AC-1〜4＋画面要件）
- AC: AC-1 作成/編集/並べ替え（順序保持）／AC-2 形式・必須・役割タグ保持（不正は 422）／AC-3 公開ガードレール（必須役割不足は 422・状態不変）／AC-4 版管理（過去版不変）
- オラクル parity: `tools/reference-mock-server/server.mjs`（`questionSets`・`normalizeQuestions`・`missingPublishRoles`・`POST`/`PUT`/`GET /question-sets`・`/publish`・`qs_seed_v1`）と HTTP 等価に。`422`（不正・ガードレール）・レスポンスキー（`questions[].{order,format,required,role_tag}`・`version`・`status`・`missing_roles`）を一致。

## 3. 触ってよいファイル範囲

- `apps/service/src/question-sets/`（新規モジュール）
  - `domain/model/questionSet.ts`（設問セット・回答形式/役割タグ検証・並び順・公開ガードレール〔必須役割不足〕・版管理）
  - `domain/interface/questionSetRepository.ts`（read/write・版の保持ポート）
  - `domain/interface/managerContextReader.ts`（呼び出しユーザーのロール/担当グループ・cross-module）
  - `infra/repository/{inMemory,prisma}QuestionSetRepository.ts`（実装＋seed＝オラクル parity・prisma は未マイグレーションで未配線 throw）
  - `use-case/{createQuestionSet,updateQuestionSet,getQuestionSet,publishQuestionSet}.ts`
  - `interfaceAdapter/api/controller/questionSetController.ts`／`interfaceAdapter/api/route/questionSetRoute.ts`
- `apps/service/src/app.ts`（router を `requireAuth` 付きで配線＋repo/seed）
- `apps/web/src/features/question-sets/`（新規: `routes/QuestionSetEditorPage.tsx`〔追加/削除/並べ替え・形式/必須/役割タグ選択・公開〕・api client）
- `apps/web/src/router.tsx`（`/question-sets` を `RequireAuth` で保護ルート追加）
- 上記範囲の unit テスト
- **範囲外**：他 feature／`apps/service` の既存 reports/summarize 等／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／ソフト設問の役割別処理（slice-20）／グループ別設定の切替（slice-22）

> 構造規約（ADR-0011）: `router → controller → use-case → repository`。公開ガードレール・版管理は use-case/domain で強制（必須役割不足は 422・過去版は不変で残す）。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-19 question-template-editor を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「設問は配列順＝並び順（order 再採番）。回答形式は short/long/select、役割タグは project_key/status/skill/internal_only（不正は 422）。公開ガードレールは必須役割 project_key≥1・skill≥1 不足で 422・公開状態にしない（不足役割をテキスト明示）。版管理: 公開で版を切り、過去 published 版は不変（過去報告を壊さない）。オラクルとレスポンスキー等価」>
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**`*.api.spec.ts` と `*.ui.spec.ts` の両方**（ADR-0018）
2. golden 撮影不可 → **`*.ui.spec.ts` の DOM アサーションが緑**（ADR-0008・0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only`）
4. シークレット・PII が出力・差分に無い

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更
- 受け入れテスト・`reference-mock/`・`docs/` の変更
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- **公開ガードレール（必須役割不足は公開拒否）・版管理（過去版不変）の骨格を崩すこと。**
- **ソフト設問の役割別処理（slice-20）／グループ別設定の切替（slice-22）に着手しない。**
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-20 wellbeing／slice-22 group-settings）>
```
