---
slice: slice-13-notification-settings
approved: false
---

# slice-13 notification-settings — 通知設定（リマインド時刻・Slack/メール ON/OFF）

> 振る舞いの正本: `reference-mock/spec.md §3.8`。データモデル: `NOTIFICATION_SETTINGS(user_id, remind_time, slack_enabled, email_enabled)`（spec.md §4）。
> REST/コードは `docs/design/overview.md §3`（Phase 3-6 表）。依存: slice-06。
> **TZ 方針**: 保存は UTC、表示・判定はユーザーのローカル時刻（spec.md §3.8・CLAUDE.md 原則9）。
> **注意**: 実際のリマインド送信は slice-16（本スライスは設定の保存・取得のみ）。

## AC-1 自分の通知設定を取得できる

- source: reference-mock        # spec.md §3.8（リマインド時刻・Slack/メール設定の存在）／REST 表現は ★PM
- **Given** ログイン済みスタッフ
- **When** `GET /notification-settings` を呼ぶ
- **Then** `200` が返り、リマインド時刻・Slack 有効/無効・メール 有効/無効・ユーザーの TZ が返る（未設定なら既定値）

## AC-2 リマインド時刻と Slack/メールの ON/OFF を更新できる

- source: reference-mock        # spec.md §3.8「スタッフごとに個別のリマインド時刻」「メールは設定で ON/OFF」／REST は ★PM
- **Given** ログイン済みスタッフ
- **When** リマインド時刻・`slack_enabled`・`email_enabled` を含む本文で `PUT /notification-settings` を呼ぶ
- **Then** `200` が返り、更新後の値が保存される。時刻形式が不正なら `422`

## AC-3 リマインド時刻は保存 UTC・表示/判定ローカルで一貫する

- source: reference-mock        # spec.md §3.8「保存を UTC、表示・判定をユーザーのローカル時刻」
- **Given** ローカル時刻 `18:00`（例: Asia/Tokyo）でリマインドを設定したスタッフ
- **When** 設定を保存し、再取得する
- **Then** 保存は UTC に正規化され、取得時はユーザーのローカル時刻で表示される（往復で `18:00` が保たれる）

## AC-4 通知設定は本人のものだけを読み書きできる（バックエンド強制）

- source: PM        # ★deny-by-default（overview §1）／未認証コード 401 は overview §3 の新規決定
- 理由: 参照モックはコード・認可の強制点を規定しない。設定は user_id に紐づき、本人の設定だけを対象とする。未認証は `401`。
- **Given** セッションを持たないクライアント／または他人の設定を対象にしようとするクライアント
- **When** `GET`/`PUT /notification-settings` を呼ぶ
- **Then** 未認証は `401`。ログイン済みでも自分以外の設定は読み書きできない（画面制御だけでなくバックエンドで強制）

## 画面要件

- 対象画面: S9 通知設定（対象: staff。`docs/画面仕様/` 通知設定系）
- golden 撮影: 可
- **UI-AC（source: PM）**
  - リマインド時刻を入力・変更できるフォームが表示される。
  - Slack 通知・メール通知の ON/OFF をそれぞれ切り替えられる。
  - 現在のタイムゾーンがローカル時刻としてテキスト表示され、時刻がどの TZ で解釈されるか分かる。

## 合成フィクスチャ（PM 所有）

**本番/実データは一切入れない**（憲法 §1-6）。TZ は保存 UTC・表示/判定ローカル。

| フィールド | 階層 | 例 | 備考 |
|---|---|---|---|
| user.id | L0 | `u_0001` | 設定の所有者 |
| user.timezone | L0 | `Asia/Tokyo` | 表示/判定ローカル |
| settings.remind_time | L0 | `18:00`（表示ローカル）→ 保存 `09:00Z` | UTC 正規化の往復検証 |
| settings.slack_enabled | L0 | `true` | Slack ON/OFF |
| settings.email_enabled | L0 | `false` | メール ON/OFF |
| other_user.id | L0 | `u_0002` | 他人設定の遮断検証 |
