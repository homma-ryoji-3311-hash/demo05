import { NotificationSettings, type NotificationSettingsView } from '../domain/model/notificationSettings.js';
import type { NotificationSettingsRepositoryInterface } from '../domain/interface/notificationSettingsRepository.js';
import type { UserTimezoneReaderInterface } from '../domain/interface/userTimezoneReader.js';

/**
 * 本人の通知設定を取得する（slice-13 AC-1）。未設定は既定値・時刻は表示ローカルへ。
 * 認可: user_id は authUserId（route）が担保。本人の設定のみを対象にする（専用パスに :id を持たせない）。
 */
export class GetNotificationSettingsUseCase {
  constructor(
    private readonly repo: NotificationSettingsRepositoryInterface,
    private readonly tzReader: UserTimezoneReaderInterface,
  ) {}

  async execute(input: { userId: string }): Promise<NotificationSettingsView> {
    const tz = await this.tzReader.getTimezone(input.userId);
    const settings = (await this.repo.findByUser(input.userId)) ?? NotificationSettings.default(input.userId);
    return settings.toView(tz);
  }
}
