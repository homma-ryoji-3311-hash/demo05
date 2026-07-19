# slice-13 notification-settings — 通知設定（リマインド時刻・Slack/メール ON/OFF・TZ 表示）

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-13.md`（approved 2026-07-19）。依存: slice-06（認証・本人強制）。フェーズ: 4。
> **TZ 方針**: 保存は UTC、表示・判定はユーザーのローカル時刻（spec.md §3.8・CLAUDE.md 原則9）。実際のリマインド送信は slice-16（本スライスは設定の保存・取得のみ）。

## 1. ゴール

スタッフ本人の通知設定を取得・更新できるようにする。`GET /notification-settings` は自分の設定（リマインド時刻・`slack_enabled`・`email_enabled`・`timezone`。未設定は既定値）を返し、`PUT /notification-settings` はリマインド時刻・Slack/メールの ON/OFF を更新する。**リマインド時刻は入力ローカル → 保存 UTC に正規化し、取得時はユーザーのローカル時刻で返す**（往復で `18:00`⇄`09:00Z` が保たれる）。時刻形式が不正なら `422`。設定は `user_id` に紐づき、**未認証は `401`・本人の設定のみ読み書き**（画面制御でなくバックエンドで強制）。加えて S9 通知設定画面で、時刻フォーム・Slack/メールのトグル・現在の TZ 表示を提供する。

## 2. 受け入れテスト（変更禁止・read-only）

**二層とも書く**（ADR-0018）。

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/notifications/notification-settings.api.spec.ts` | backend |
| UI | `acceptance/notifications/notification-settings.ui.spec.ts` | **backend ＋ frontend** |

- golden: **撮影不可**（参照モックに S9 画面が無く answer key を持たない）。完了判定は `*.ui.spec.ts` の role/DOM アサーションが緑（ADR-0008・0018）。
- 仕様表: `docs/spec/slice-13.md`（approved・AC-1〜4＋画面要件）
- AC: AC-1 自分の設定取得（未設定=既定値）／AC-2 更新＋不正時刻は 422／AC-3 保存 UTC・表示ローカルの往復一貫／AC-4 未認証 401・本人のみ
- オラクル parity: `tools/reference-mock-server/server.mjs`（`notificationSettings`・`localToUtc`/`utcToLocal`・`GET`/`PUT /notification-settings`）と HTTP 等価に。レスポンスキー（`remind_time`／`remind_time_utc`／`slack_enabled`／`email_enabled`／`timezone`）・`422`／`401` を一致させる。

## 3. 触ってよいファイル範囲

- `apps/service/src/notifications/`（新規モジュール）
  - `domain/model/notificationSettings.ts`（設定モデル・`remind_time` 形式検証〔不正は 422＝ドメインエラー〕・ローカル⇄UTC 正規化のドメインロジック）
  - `domain/interface/notificationSettingsRepository.ts`（`user_id` 単位の read/write ポート）
  - `domain/interface/userTimezoneReader.ts`（本人の TZ を読む cross-module ポート・templates の `userContextReader` と同型）
  - `infra/repository/{inMemory,prisma}NotificationSettingsRepository.ts`（実装＋既定値。prisma はモデル未マイグレーションのため未配線 throw）
  - `use-case/getNotificationSettings.ts`／`use-case/updateNotificationSettings.ts`
  - `interfaceAdapter/api/controller/notificationSettingsController.ts`
  - `interfaceAdapter/api/route/notificationSettingsRoute.ts`
- `apps/service/src/app.ts`（`createNotificationSettingsRouter` を `/notification-settings` に `requireAuth` 付きで配線＋repo/userTimezoneReader 配線）
- `apps/web/src/features/notifications/`（新規: `routes/NotificationSettingsPage.tsx`・feature index・api client）
- `apps/web/src/router.tsx`（`/notification-settings` を `RequireAuth` で保護ルート追加）
- 上記範囲の unit テスト
- **範囲外**：他 feature（reports・skillsheets・templates・home・auth 本体）／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／リマインド送信ジョブ（slice-16）

> 構造規約（ADR-0011）: `router → controller → use-case → repository` の一方向。TZ は本人の設定に紐づくため `userTimezoneReader` で参照（templates の cross-module read ポートと同型・`app.ts` で配線）。`requireAuth` は auth 本体を変更せず既存ミドルウェアを配線するだけ。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-13 notification-settings を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります。
  api.spec.ts と ui.spec.ts の両方です。ui.spec.ts は backend と frontend の
  両方を runner で起動して検証します。まず現状の赤を確認してください
  （当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「remind_time は入力ローカル→保存 UTC 正規化・取得はローカルへ戻す（往復で 18:00⇄09:00Z）。不正時刻は 422（Zod/express-validator）。未認証 401・本人の設定のみ（deny-by-default）。オラクル server.mjs とレスポンスキー等価」>
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
- **実際のリマインド送信・スケジュールジョブ・Slack/メール配信の実装に着手しない**（slice-16 の仕事。本スライスは設定の保存・取得と S9 画面まで）
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-14 管理者コンソール／slice-16 slack-reminder）>
```
