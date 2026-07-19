import type { GetNotificationSettingsUseCase } from '../../../use-case/getNotificationSettings.js';
import type { UpdateNotificationSettingsUseCase } from '../../../use-case/updateNotificationSettings.js';
import type { NotificationSettingsView } from '../../../domain/model/notificationSettings.js';

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-13 通知設定）。
 * Express の Request/Response には依存しない（戻り値を route が送出する）。
 * 未認証 401 は route の authUserId、不正時刻 422 はドメインが担う。
 */
export class NotificationSettingsController {
  constructor(
    private readonly getNotificationSettings: GetNotificationSettingsUseCase,
    private readonly updateNotificationSettings: UpdateNotificationSettingsUseCase,
  ) {}

  async get(userId: string): Promise<{ status: number; body: NotificationSettingsView }> {
    const view = await this.getNotificationSettings.execute({ userId });
    return { status: 200, body: view };
  }

  async put(userId: string, body: unknown): Promise<{ status: number; body: NotificationSettingsView }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const view = await this.updateNotificationSettings.execute({
      userId,
      remindTime: b.remind_time,
      slackEnabled: b.slack_enabled,
      emailEnabled: b.email_enabled,
    });
    return { status: 200, body: view };
  }
}
