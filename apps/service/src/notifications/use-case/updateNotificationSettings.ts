import { NotificationSettings, type NotificationSettingsView } from '../domain/model/notificationSettings.js';
import type { NotificationSettingsRepositoryInterface } from '../domain/interface/notificationSettingsRepository.js';
import type { UserTimezoneReaderInterface } from '../domain/interface/userTimezoneReader.js';

/**
 * 本人の通知設定を更新する（slice-13 AC-2/AC-3）。remind_time はローカル入力 → 保存 UTC へ正規化。
 * 不正な時刻形式はドメインが 422 を投げる（保存しない）。Slack/メールは省略時据え置き。
 */
export class UpdateNotificationSettingsUseCase {
  constructor(
    private readonly repo: NotificationSettingsRepositoryInterface,
    private readonly tzReader: UserTimezoneReaderInterface,
  ) {}

  async execute(input: {
    userId: string;
    remindTime: unknown;
    slackEnabled: unknown;
    emailEnabled: unknown;
  }): Promise<NotificationSettingsView> {
    const tz = await this.tzReader.getTimezone(input.userId);
    const settings = (await this.repo.findByUser(input.userId)) ?? NotificationSettings.default(input.userId);
    settings.update(
      { remindTimeLocal: input.remindTime, slackEnabled: input.slackEnabled, emailEnabled: input.emailEnabled },
      tz,
    );
    await this.repo.save(settings);
    return settings.toView(tz);
  }
}
