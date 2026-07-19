# slice-17 staff-approval — 承認待ち／承認・担当紐付け

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-17.md`（approved 2026-07-19）。依存: slice-14。フェーズ: 4。
> **スコープ**: 新規スタッフの deny-by-default（承認待ち）と、super admin による承認＋担当紐付け（主/副・チャネル・報告サイクル）。
> **PM 決定（2026-07-15）**: 承認主体・承認待ち一覧の可視範囲＝**super admin**。**主/副担当の操作差の細部・system/super admin の分離は slice-24 permission-model へ**（本スライスは主/副の属性を「設定できる」ことまで）。

## 1. ゴール

Google ログイン済みだが未承認の新規スタッフは **deny-by-default**：`/me`（自分の状態確認）以外の保護 API は `403`（報告フローに入れない・バックエンド強制・AC-1）。**super admin** が `POST /admin/staff/:id/approve` で担当（主/副）・チャネル・報告サイクルを指定して承認すると、スタッフは `active` になり担当関係・チャネル・サイクルが紐づく（AC-2）。承認後は deny-by-default が解除され報告フローに入れる（AC-3）。承認待ちスタッフ一覧は **super admin のみ**取得でき、他ロールには見せない（AC-4）。加えて S12 承認画面（承認待ち一覧＋主/副・チャネル・サイクル指定の承認導線）と、未承認スタッフ側の「承認待ち」画面を提供する。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/admin/staff-approval.api.spec.ts` | backend |
| UI | `acceptance/admin/staff-approval.ui.spec.ts` | **backend ＋ frontend** |

- golden: **撮影不可**（参照モックに S12 画面が無く answer key を持たない）。完了判定は `*.ui.spec.ts` の DOM アサーション（ADR-0008・0018）。
- 仕様表: `docs/spec/slice-17.md`（approved・AC-1〜4＋画面要件）
- AC: AC-1 deny-by-default（未承認は 403）／AC-2 super admin 承認で担当・チャネル・サイクル設定／AC-3 承認で deny 解除／AC-4 承認待ち一覧は super admin のみ
- オラクル parity: `tools/reference-mock-server/server.mjs`（`super01`・`pend_ac*` seed・pending ゲート・`GET /admin/staff/pending`・`POST /admin/staff/:id/approve`）と HTTP 等価に。`403`（未承認/権限外）・`422`（不正な担当ロール）・レスポンスキー（`status`/`assignment`/`channel`/`cycle`・`pending[]`）を一致させる。

## 3. 触ってよいファイル範囲

- `apps/service/src/staff-approval/`（新規モジュール）
  - `domain/model/staffApproval.ts`（承認状態 `pending→active`・担当ロール `primary/secondary` 検証〔不正は 422〕・チャネル・サイクル）
  - `domain/interface/staffAccountRepository.ts`（スタッフの承認状態・担当属性の read/write ポート）
  - `domain/interface/approverContextReader.ts`（呼び出しユーザーが super admin か読む cross-module ポート）
  - `infra/repository/{inMemory,prisma}StaffAccountRepository.ts`（実装＋seed＝オラクル parity・prisma は未マイグレーションのため未配線 throw）
  - `use-case/listPendingStaff.ts`／`use-case/approveStaff.ts`
  - `interfaceAdapter/api/controller/staffApprovalController.ts`
  - `interfaceAdapter/api/route/staffApprovalRoute.ts`
  - `interfaceAdapter/api/middleware/denyByDefault.ts`（**未承認〔pending〕は保護ルートで 403。`/me` は許可**。既存ミドルウェア〔requireAuth〕の後段に1回だけ挿す）
- `apps/service/src/app.ts`（router＋denyByDefault ミドルウェアを保護ルート群に配線＋repo/seed 配線）
- `apps/web/src/features/staff-approval/`（新規: `routes/PendingApprovalPage.tsx`〔未承認スタッフの承認待ち画面〕・`routes/ApprovalConsolePage.tsx`〔super admin 承認・担当紐付け〕・feature index・api client）
- `apps/web/src/router.tsx`（`/admin/staff/pending` を `RequireAuth` で保護ルート追加）
- 上記範囲の unit テスト
- **範囲外**：他 feature（reports・skillsheets・templates・home・auth 本体）／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／**主/副担当の操作差そのもの・system/super admin の分離（slice-24）／報告サイクル判定ロジック（slice-15）**

> 構造規約（ADR-0011）: `router → controller → use-case → repository` の一方向。**deny-by-default はミドルウェア/service 層で強制**（画面制御に依存しない・AC-1/AC-3）。承認は super admin のみ（`approverContextReader`・AC-2/AC-4）。承認時に設定する主/副の属性は**保存するだけ**——操作差の解釈は slice-24 の仕事（ここで実装しない）。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-17 staff-approval を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「deny-by-default は未承認(pending)を保護ルートで 403（/me だけ許可）、ミドルウェア/service 層で強制（画面制御に依存しない）。承認は super admin のみ（manager/staff は 403）。承認で status=active・担当(主/副)・チャネル・サイクルを保存（主/副の操作差は slice-24・ここでは属性保存まで）。不正な担当ロールは 422。オラクルとレスポンスキー等価」>
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
- **deny-by-default の骨格を崩さないこと**: 未承認は `/me` 以外 403／承認主体は super admin のみ／承認で属性を保存するが**主/副の操作差は解釈しない**（slice-24）。
- **主/副担当の操作差・system/super admin の分離（slice-24）／報告サイクル判定（slice-15）に着手しない。**
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-14 admin-console／slice-24 permission-model）>
```
