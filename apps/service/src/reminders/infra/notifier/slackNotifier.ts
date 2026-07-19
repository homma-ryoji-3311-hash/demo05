import type { NotifierInterface } from '../../domain/interface/notifier.js';
import type { ReminderChannel } from '../../domain/model/reminderRule.js';

/**
 * 実チャネル実装のスケルトン（提供元依存はこの infra に閉じる・overview §5）。
 * **Webhook/トークンは `.env` のみ**（フィクスチャ・差分・ログに出さない・憲法 §1-7）。
 * CI/テストは fakeNotifier を注入し、実送信はしない。実 SDK 配線は downstream の詳細実装。
 */
export class SlackNotifier implements NotifierInterface {
  async send(userId: string, channels: ReminderChannel[]): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL; // 秘密は .env のみ・差分/ログに出さない
    if (!webhookUrl) throw new Error('SLACK_WEBHOOK_URL not configured (.env)');
    // 実送信（badge=アプリ内通知 / slack=Webhook / email=メール SDK）は downstream の詳細実装。
    // 黙って no-op（silent success）にせず、未実装を明示する（CI では fakeNotifier を注入）。
    throw new Error(
      `SlackNotifier skeleton: real dispatch not implemented (user=${userId}, channels=${channels.join(',')})`,
    );
  }
}
