import type { NotifierInterface } from '../../domain/interface/notifier.js';
import type { ReminderChannel } from '../../domain/model/reminderRule.js';

/**
 * テスト用の決定的フェイク notifier（PM 決定 2026-07-15）。
 * 実 Slack/メールへは送らず、「誰に・どのチャネルで送ったか」を sink に捕捉する（実送信を CI に持ち込まない）。
 */
export class FakeNotifier implements NotifierInterface {
  readonly sink: Array<{ userId: string; channels: ReminderChannel[] }> = [];

  async send(userId: string, channels: ReminderChannel[]): Promise<void> {
    this.sink.push({ userId, channels });
  }
}
