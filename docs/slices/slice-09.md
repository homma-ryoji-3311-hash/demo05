# slice-09 skillsheet-view — スキルシート閲覧

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。
> **依存: slice-08 下流の後**（同一 `skillsheets` feature が存在してから着手）。

## 1. ゴール

`GET /skill-sheets`（自分の生成済み一覧・生成日時の新しい順・履歴込み）、`GET /skill-sheets/:id/download`（**元 xlsx** の署名付き URL）、`GET /skill-sheets/:id/preview`（**HTML** プレビュー・PM決定）。無し `404`・他人 `403`・未認証 `401`。S6 画面で一覧＋各行の xlsx ダウンロード導線＋HTML プレビュー導線（読み取り専用）。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/skillsheets/view.api.spec.ts` | backend |
| UI | `acceptance/skillsheets/view.ui.spec.ts` | backend ＋ frontend |

- golden: 撮影可（未撮影・現状は `view.ui.spec.ts` の DOM アサーションで検証・ADR-0008/0018）
- 仕様表: `docs/spec/slice-09.md`（approved）
- AC: AC-1 一覧＋履歴 ／ AC-2 DL は元 xlsx ／ AC-3 他人 403 ／ AC-4 REST（200/404/401）／ AC-5 HTML プレビュー

## 3. 触ってよいファイル範囲

- `apps/service/src/skillsheets/`（slice-08 の feature に read 系を追加）
  - `use-case/{listSkillSheets,getSkillSheetForDownload,getSkillSheetPreview}.ts`
  - `domain/interface/skillSheetRepository.ts`（`findByUser` / `findById` の read を追加）
  - `interfaceAdapter/api/controller/skillSheetController.ts` ／ `route/skillSheetRoute.ts`（GET `/skill-sheets`・`/:id/download`・`/:id/preview`）
- `apps/web/src/features/skillsheets/`（S6・`routes/SkillSheetListPage.tsx` ／ `api/skillSheetsApi.ts` ／ `index.ts`）
- `apps/service/src/app.ts` ／ `apps/web/src/router.tsx`（配線）
- 上記範囲の unit テスト
- **範囲外**：**生成本体（slice-08 の言い換え/生成ロジック）**／reports・auth 本体／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-09 skillsheet-view を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。api.spec.ts と ui.spec.ts の両方です。
  ui.spec.ts は backend と frontend の両方を runner で起動して検証します。
  まず現状の赤を確認してください（当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
読み取り専用（生成物を変更しない）。ダウンロードは元の xlsx（プレビュー変換でない）。プレビューは HTML（PM決定・PDF/画像でない）。他人のシートは 403。seed（sk_seed_v1/v2・sk_other）を backend でもオラクルと同一に持つこと。
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
- **生成本体（slice-08 の言い換え/生成ロジック）への着手**／reports・auth 本体への着手
- **slice-08 下流が未着手のまま着手すること**（`skillsheets` feature が存在してから）
