# slice-14 admin-console — 管理者コンソール/スタッフ一覧

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-14.md`（approved 2026-07-19）。依存: slice-06（認証・ロール境界）。フェーズ: 4。
> **スコープ**: 「担当グループのスタッフ一覧表示＋担当外の遮断」に絞る。報告状況は §3.9 の二値（報告済み／未報告）まで。**5 ステータスは slice-15／各行操作の実挙動は slice-09・21／個人単位の担当・権限3軸は slice-24**（本スライスはグループ単位・列参照のみ）。

## 1. ゴール

manager が `GET /admin/staff` で**自分の担当グループのスタッフ一覧**を取得できる。スタッフごとに 氏名・客先・最終報告日時・報告状況（`reported`/`not_reported`）・最新スキルシートの有無 を返し、レスポンスに担当グループ一覧（タブ用）を含める。`?group=<G>` で担当グループ内のタブ絞り込み。**担当グループ外のスタッフはバックエンドで除外**（画面制御でなく service 層の認可境界・AC-2）。`staff` ロールの呼び出しは `403`（AC-4）。加えて S8 管理者コンソール画面で、グループタブ・スタッフ表（氏名/客先/報告状況/最新シート/操作の列）を提供する。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/admin/admin-console.api.spec.ts` | backend |
| UI | `acceptance/admin/admin-console.ui.spec.ts` | **backend ＋ frontend** |

- golden: **撮影不可**（参照モックに S8 画面が無く answer key を持たない）。完了判定は `*.ui.spec.ts` の role/DOM アサーションが緑（ADR-0008・0018）。
- 仕様表: `docs/spec/slice-14.md`（approved・AC-1〜4＋画面要件）
- AC: AC-1 担当グループのスタッフ一覧（表示列つき）／AC-2 担当外(G2)遮断＝バックエンド強制／AC-3 グループタブ絞り込み／AC-4 staff は 403
- オラクル parity: `tools/reference-mock-server/server.mjs`（`admin01`〔groups G1/G3〕・`adminStaff` seed・`managerGroups`・`GET /admin/staff`）と HTTP 等価に。レスポンスキー（`groups`／`staff[].{id,name,group_id,client_name,last_report_at,report_status,has_latest_sheet}`）・`403`／`401` を一致させる。

## 3. 触ってよいファイル範囲

- `apps/service/src/admin/`（新規モジュール）
  - `domain/model/adminStaffRow.ts`（一覧行モデル・報告状況の二値・表示列）
  - `domain/interface/adminStaffReader.ts`（担当グループ×スタッフの read ポート。可視範囲の絞り込みをドメイン側で表現）
  - `domain/interface/managerContextReader.ts`（呼び出しユーザーのロール・担当グループを読む cross-module ポート・templates の `userContextReader` と同型）
  - `infra/repository/{inMemory,prisma}AdminStaffReader.ts`（実装＋seed＝オラクル parity・prisma は未マイグレーションのため未配線 throw）
  - `use-case/listAdminStaff.ts`（ロール検査〔staff は 403〕→ 担当グループへ絞り込み → `?group` 交差 → 行整形）
  - `interfaceAdapter/api/controller/adminController.ts`
  - `interfaceAdapter/api/route/adminRoute.ts`
- `apps/service/src/app.ts`（`createAdminRouter` を `/admin` に `requireAuth` 付きで配線＋reader/seed 配線）
- `apps/web/src/features/admin/`（新規: `routes/AdminConsolePage.tsx`〔グループタブ＋スタッフ表〕・feature index・api client）
- `apps/web/src/router.tsx`（`/admin/staff` を `RequireAuth` で保護ルート追加）
- 上記範囲の unit テスト
- **範囲外**：他 feature（reports・skillsheets・templates・home・auth 本体）／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／**報告サイクル・5 ステータス（slice-15）／各行操作の実挙動・全員分生成（slice-09・21）／個人単位の担当・権限3軸（slice-24）**

> 構造規約（ADR-0011）: `router → controller → use-case → repository` の一方向。ロール境界（staff→403）と可視範囲の絞り込みは **use-case/service 層で強制**（画面制御に依存しない・AC-2/AC-4）。担当グループは `managerContextReader` で参照（cross-module read・`app.ts` で配線）。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-14 admin-console を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「可視範囲の絞り込み・staff→403 は service 層で強制（画面制御に依存しない）。担当外グループ(G2)は応答に一切含めない。報告状況は reported/not_reported の二値まで（5 ステータスは slice-15）。オラクル server.mjs とレスポンスキー等価・admin01 の担当は G1/G3」>
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**`*.api.spec.ts` と `*.ui.spec.ts` の両方**（ADR-0018）
2. golden 撮影不可 → **`*.ui.spec.ts` の DOM アサーションが緑**で代替（ADR-0008・0018）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only` と突き合わせ）
4. シークレット・PII が出力・差分に無い

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更
- 受け入れテスト・`reference-mock/`・`docs/` の変更（＝仕様と answer key）
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- **報告サイクル・5 ステータス（slice-15）／各行操作の実挙動・全員分生成（slice-09・21）／個人単位の担当・権限3軸（slice-24）に着手しない。** 本スライスはグループ単位の一覧表示・担当外遮断・二値の報告状況までで止める。
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-15 report-cycle-status／slice-17 staff-approval）>
```
