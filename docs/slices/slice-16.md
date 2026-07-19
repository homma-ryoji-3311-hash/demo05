# slice-16 slack-reminder — Slack リマインド（短間隔ジョブによる抽出送信）

> 指示書の正本（ADR-0006）。issue 本文はポインタのみ。仕様表: `docs/spec/slice-16.md`（approved 2026-07-19）。依存: slice-13（通知設定）・slice-15（未報告ステータス）。フェーズ: 4。
> **TZ 方針**: 保存 UTC・判定はユーザーのローカル時刻。**通知は提供元非依存の抽象化層**の背後で行い、Slack/メール SDK・Webhook をドメイン層に書かない（overview §5 を通知に適用）。
> **決定（PM・2026-07-15）**: 外部 Slack/メール送信は**決定的フェイク notifier に差し替える**（実送信を CI に持ち込まない・「誰に・どのチャネルで」をアサート）。退勤連動起点の締切/タイミングは後続スライスへ。

## 1. ゴール

短間隔ジョブが実行時刻（`run_at`・UTC）に「今この時刻に通知すべきユーザー」を DB から抽出して送る（ユーザーごとに個別スケジュールを立てない）。抽出条件：各ユーザーのリマインド時刻を**ローカル時刻に換算して判定**（保存 UTC・AC-2）、かつ**提出済みでない**（未報告になりうる・AC-4）。送信は**まずアプリ内バッジ通知**、Slack/メールは各ユーザーの `slack_enabled`/`email_enabled` に従う（OFF には送らない・AC-3）。実 Slack/メールへは送らず、通知抽象化層の**フェイク notifier に「誰に・どのチャネルで送ったか」を捕捉**してアサートする。

## 2. 受け入れテスト（変更禁止・read-only）

| 層 | パス | 起動するもの |
|---|---|---|
| API | `acceptance/notifications/slack-reminder.api.spec.ts` | backend |
| UI | **なし（画面なし）** | — |

- golden: **撮影不可（画面なし）**。背景ジョブ＋通知送信で UI を持たない（通知の ON/OFF・時刻編集は slice-13 の S9）。完了判定は API 受け入れテストが緑（ADR-0018）。
- 仕様表: `docs/spec/slice-16.md`（approved・AC-1〜4＋通知テスト方式の PM 決定）
- AC: AC-1 短間隔ジョブが対象を抽出／AC-2 ローカル判定・保存 UTC／AC-3 バッジ＋設定に従う Slack/メール／AC-4 提出済みは送らない
- オラクル parity: `tools/reference-mock-server/server.mjs`（`reminderUsers` seed・`localToUtcHHMM`・`POST /jobs/reminder/run`）と**抽出の意味論が等価**であること。**REST 形状ではなく「run_at→対象ユーザーとチャネル」を合わせる**（実スケジューラ・notifier 抽象化は downstream の詳細設計）。

> 画面なしは仕様表 §画面要件に理由つき明記済み（背景ジョブ・専用画面なし）。§3 に `apps/web/` は挙げない（ADR-0018）。

## 3. 触ってよいファイル範囲

- `apps/service/src/reminders/`（新規モジュール）
  - `domain/model/reminderRule.ts`（抽出条件: ローカル時刻換算での「到来」判定・提出済み除外・チャネル決定〔まずバッジ→設定に従う〕）
  - `domain/interface/reminderTargetReader.ts`（対象ユーザー〔通知設定＋提出状況〕を読む read ポート）
  - `domain/interface/notifier.ts`（**提供元非依存の通知抽象化層**。`send(userId, channels)` の seam。実 Slack/メール SDK はここに書かない）
  - `infra/repository/{inMemory,prisma}ReminderTargetReader.ts`（実装＋seed＝オラクル parity・prisma は未マイグレーションのため未配線 throw）
  - `infra/notifier/fakeNotifier.ts`（テスト用の決定的フェイク＝送信先を捕捉。実送信しない）
  - `infra/notifier/slackNotifier.ts`（実チャネル実装のスケルトン。**Webhook/トークンは `.env` のみ**・フィクスチャ/差分に出さない）
  - `use-case/runReminderJob.ts`（`run_at` を受け対象抽出→notifier へ dispatch）
  - `interfaceAdapter/api/controller/reminderController.ts`
  - `interfaceAdapter/api/route/reminderRoute.ts`（**ジョブ trigger の REST 形状は downstream 詳細設計。オラクルの URL は semantics fixture**）
- `apps/service/src/app.ts`（router 配線＋reader/notifier 配線。テストは fakeNotifier を注入）
- 上記範囲の unit テスト
- **範囲外**：`apps/web/`（画面なし）／他 feature（reports・skillsheets・templates・home・auth 本体）／`acceptance/` `reference-mock/` `docs/` `.claude/`／DB マイグレーション／**通知設定の編集画面（slice-13）／未報告ステータス判定そのもの（slice-15）／退勤連動タイミング（後続）**

> 構造規約（ADR-0011）: `router → controller → use-case → repository`。**通知は notifier 抽象化層の背後**（Summarizer と同型・overview §5）。テストは `fakeNotifier` を app.ts で注入して「誰に・どのチャネルで」を観測する（実送信ゼロ）。秘密（Webhook/トークン）は `.env` のみ・差分に出さない（憲法 §1-7）。

## 4. 貼り付け用の枠（`/implement` が読む）

```
このリポジトリで slice-16 slack-reminder を実装します。
- 触ってよいのは指示書「3. ファイル範囲」のファイルのみ。範囲外は変更禁止。
- 「2. 受け入れテスト」を全て緑にするのがゴール。テストは既にあります（api.spec.ts のみ・画面なし）。
  まず現状の赤を確認してください（当該スイートのみ実行・list レポータ）。
- 「3. ファイル範囲」に挙がっているのに一度も触らなかったディレクトリがあるなら、
  テストが緑でも完了ではありません。停止して、なぜ触らずに緑になったかを報告してください。
- commit / push / DB マイグレーションはしないこと。緑になったら停止して報告してください。
- 不明点はコードを推測で埋めず、リーダーに質問として出してください。
<リーダー記入：このスライス固有の注意を1〜2行。候補＝「外部送信は fakeNotifier に差し替え、実 Slack/メールへ送らない（Webhook/トークンは .env のみ・差分/フィクスチャに出さない）。抽出はローカル時刻換算での到来判定＋提出済み除外。チャネルはまずバッジ→slack_enabled/email_enabled に従う（OFF に送らない）。オラクルとは run_at→対象ユーザー・チャネルの意味論を合わせる（URL 形状に依存しすぎない）」>
```

## 5. 完了の定義（4つとも機械判定・変えない）

1. 受け入れテストが緑（生ログを提示）。**画面なしのため `*.api.spec.ts` のみ**（ADR-0018）
2. 画面なし → golden 該当なし（完了判定①で代替）
3. **「3. ファイル範囲」に挙げた全ディレクトリに diff がある**（`git diff --name-only` と突き合わせ）
4. シークレット・PII が出力・差分に無い（**特に Slack Webhook/トークンを差分・ログに出さない**）

## 6. 禁止事項

- commit / push / DB マイグレーション（統合役・層境ゲート経由）
- 範囲外ファイルの変更（特に `apps/web/`＝画面なし）
- 受け入れテスト・`reference-mock/`・`docs/` の変更（＝仕様と answer key）
- **テストがカバーしない範囲を黙って省略すること。** 質問として出す（憲法 §3）
- **実 Slack Webhook・実メール送信を CI/テストに持ち込むこと。** 送信は fakeNotifier で捕捉する。**秘密は `.env` のみ**（フィクスチャ・差分・ログに出さない）。
- **通知抽象化層を飛ばして Slack/メール SDK をドメイン層に直書きすること**（overview §5）。
- **通知設定の編集画面（slice-13）／未報告ステータス判定（slice-15）／退勤連動タイミング（後続）に着手しない。**
- <リーダー記入：着手してはいけない隣接スライスの領域（候補＝slice-13 notification-settings／slice-15 report-cycle-status）>
```
