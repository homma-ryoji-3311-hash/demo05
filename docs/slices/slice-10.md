# slice-10 excel-template-manage — Excel テンプレート管理

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。対象: manager。

## 1. ゴール

`POST /templates`（アップロード＋アンカー検証・欠落は `422`・**有効版に登録しない**）、`PUT /templates/:id/activate`（有効版切替・**旧版は履歴として残す**）、`GET /templates`（自グループの版一覧・有効版フラグ）。**manager 権限**が必要（staff `403`・未認証 `401`）。S7 画面でアップロードフォーム＋アンカー検証結果＋版一覧/有効版/切替。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/templates/manage.api.spec.ts` | backend |
| UI | `acceptance/templates/manage.ui.spec.ts` | backend ＋ frontend |

- golden: 撮影可（未撮影・現状は `manage.ui.spec.ts` の DOM アサーションで検証・ADR-0008/0018）
- 仕様表: `docs/spec/slice-10.md`（approved）
- AC: AC-1 アンカー検証アップロード ／ AC-2 欠落は 422 ／ AC-3 有効版切替＋履歴 ／ AC-4 manager 認可（staff403・未認証401）

## 3. 触ってよいファイル範囲

- `apps/service/src/templates/`
  - `use-case/{uploadTemplate,activateTemplate,listTemplates}.ts`
  - `domain/interface/templateRepository.ts` ／ `domain/model/template.ts`（**アンカー検証**）
  - `infra/repository/{inMemory,prisma}TemplateRepository.ts`
  - `interfaceAdapter/api/controller/templateController.ts` ／ `route/templateRoute.ts`
- **manager 認可**: `apps/service/src/common/interfaceAdapter/api/` の role ガード（`requireRole('manager')` 等）or use-case で `user.role` を **read**
- `apps/web/src/features/templates/`（S7・`routes/TemplateManagePage.tsx` ／ `api` ／ `index.ts`）
- `apps/service/src/app.ts` ／ `apps/web/src/router.tsx`（配線）
- **backend の user seed に `mgr01`（role=manager・group_id）を追加**（`apps/service/src/auth/infra/repository/inMemoryUserRepository.ts` の seed のみ・**auth 本体ロジックは不変**・オラクルと parity）
- 上記範囲の unit テスト
- **範囲外**：skillsheets・reports 本体／**auth の認証ロジック本体（role は read のみ・seed 追加を除く）**／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-10 excel-template-manage を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。api.spec.ts と ui.spec.ts の両方です。
  ui.spec.ts は backend と frontend の両方を runner で起動して検証します。
  まず現状の赤を確認してください（当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
テンプレート管理は manager のみ（staff は 403・未認証は 401）。アンカー欠落は 422（有効版に登録しない）。有効版切替は旧版を履歴として残す（削除しない）。manager ユーザー mgr01 を backend の user seed にもオラクルと同一に足す（auth 本体ロジックは変えない）。
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログ）。**`*.api.spec.ts` と `*.ui.spec.ts` の両方**（ADR-0018）
2. golden 差分が閾値内。**撮影不可のため `*.ui.spec.ts` の DOM アサーションが緑**（ADR-0008・0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**
4. シークレット・PII が出力・差分に無い

## 6. 禁止事項

- commit / push / DB マイグレーション
- 範囲外ファイルの変更
- 受け入れテスト・`reference-mock/`・`docs/` の変更
- skillsheets・reports 本体、**auth の認証ロジック本体**への着手（role は read・`mgr01` seed 追加のみ許可）
- アンカー欠落テンプレートを有効版に登録すること（AC-2）／有効版切替で旧版を削除すること（AC-3・履歴を残す）
