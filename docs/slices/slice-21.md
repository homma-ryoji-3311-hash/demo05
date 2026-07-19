# slice-21 bulk-download — 一括ダウンロード

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-21.md`（approved 2026-07-19）。依存: slice-09・slice-14。フェーズ: 6。画面: S11。
> 振る舞いの正本: `spec.md §3.9`（全員分生成・ZIP・客先/部署絞り込み）・`§3.5`（決定的生成・機械命名）。REST は設計（overview §3 `POST /admin/skill-sheets/bulk`）。

## 1. ゴール

manager が最新マスター元データ（MASTER_SUMMARIES）から**全スタッフ分のスキルシートを一括生成**し、**ZIP** として出力する（`POST /admin/skill-sheets/bulk`）。**客先・部署・グループ**で対象を絞り込める。**manager 権限に限定**（staff は `403`）・自分の担当グループのスタッフのみ。出力ファイル名は **`[スタッフ名]_[ファイル名]_YYYYMMDD.xlsx`**（出力日）を機械付与。**マスター未生成のスタッフはスキップ**し、**除外者一覧（manifest）を ZIP に同梱**して追跡可能にする（1人の未生成で全体を止めない）。S11 一括ダウンロード画面を提供。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/skillsheets/bulk-download.api.spec.ts` | backend |
| UI | `acceptance/skillsheets/bulk-download.ui.spec.ts` | **backend ＋ frontend** |

- golden: 撮影不可（参照モックに S11 画面なし）→ `*.ui.spec.ts` の DOM アサーション（ADR-0018）。
- 仕様表: `docs/spec/slice-21.md`（approved・AC-1〜5＋画面要件）
- AC: AC-1 全員分生成→ZIP（entries）／AC-2 客先/部署/グループ絞り込み／AC-3 manager 限定（staff 403）／AC-4 機械命名／AC-5 未生成スキップ＋manifest
- オラクル parity: `tools/reference-mock-server/server.mjs`（`bulkStaff`・`bulkMgrGroups`・`bulkFilename`・`POST /admin/skill-sheets/bulk`）と**構造が等価**であること。**ZIP は entries/skipped/manifest の構造で表現**（実 ZIP バイナリ生成は downstream 詳細設計）。命名規則・`403`・manifest を一致。

## 3. 触ってよいファイル範囲

- `apps/service/src/skillsheets/`（既存 skillsheets の拡張）
  - `use-case/bulkGenerateSkillSheets.ts`（担当グループ×絞り込みで対象決定→各スタッフを最新マスターから生成→未生成はスキップ＋manifest）
  - `domain/model/bulkManifest.ts`（生成/スキップ集計・除外者一覧）
  - `domain/interface/staffRosterReader.ts`（客先/部署/グループ属性つきスタッフ台帳の read ポート・cross-module）
  - `infra/repository/{inMemory,prisma}StaffRosterReader.ts`（実装＋seed＝オラクル parity・prisma は未マイグレーションで未配線 throw）
  - `infra/zip/skillSheetZipPackager.ts`（**ZIP パッケージング＝実装時詳細設計**。entries＋manifest を ZIP に束ねる。オラクルは構造で等価）
  - `interfaceAdapter/api/controller/skillSheetController.ts`（bulk エンドポイント）／`interfaceAdapter/api/route/skillSheetRoute.ts`
- `apps/service/src/app.ts`（staffRosterReader・ZIP packager の配線＋seed）
- `apps/web/src/features/skillsheets/routes/BulkDownloadPage.tsx`（新規: S11・絞り込み・全員分生成・ZIP DL・件数/未生成のテキスト表示）
- `apps/web/src/router.tsx`（`/bulk-download` を `RequireAuth` で保護ルート追加）
- 上記範囲の unit テスト
- **範囲外**：他 feature／既存 skillsheets の個別生成/閲覧（slice-08/09 は不変）／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／管理者コンソール本体（slice-14）／グループ設定（slice-22）

> 構造規約（ADR-0011）: `router → controller → use-case → repository`。manager 限定・担当グループ絞り込みは use-case で強制（staff 403）。**ZIP 生成の実体は infra の packager**（domain/use-case は entries/skipped/manifest の構造だけ扱う＝オラクルと等価）。機械命名（`[名前]_[ファイル名]_YYYYMMDD.xlsx`）はサーバ側。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-21 bulk-download を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「manager 限定・自分の担当グループのみ（staff 403）。客先/部署/グループで絞り込み。ファイル名は [スタッフ名]_[ファイル名]_YYYYMMDD.xlsx をサーバ機械付与。マスター未生成スタッフはスキップし manifest（除外者一覧）を ZIP に同梱（1人の未生成で全体を止めない）。ZIP パッケージングは infra、domain は entries/skipped/manifest 構造でオラクルと等価に。既存の個別生成(slice-08/09)は壊さない」>
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
- **未生成スタッフで全体を止めること・manifest を省くこと・命名規則を崩すこと。**
- **管理者コンソール本体（slice-14）／グループ設定（slice-22）／個別生成・閲覧（slice-08/09）の作り替えに着手しない。**
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-14 admin-console／slice-22 group-settings）>
```
