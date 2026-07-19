import type { ReminderChannel } from '../model/reminderRule.js';

/**
 * 提供元非依存の通知抽象化層（Summarizer と同型・overview §5）。
 * `send(userId, channels)` の seam だけを公開し、実 Slack/メール SDK・Webhook はここに書かない。
 * テストは fakeNotifier を app.ts で注入して「誰に・どのチャネルで送ったか」を観測する（実送信ゼロ）。
 */
export interface NotifierInterface {
  send(userId: string, channels: ReminderChannel[]): Promise<void>;
}
