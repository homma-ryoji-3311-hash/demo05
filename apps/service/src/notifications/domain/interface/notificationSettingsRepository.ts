import type { NotificationSettings } from '../model/notificationSettings.js';

/**
 * 通知設定の read/write ポート（slice-13）。設定は user_id 単位（本人のみ・専用パスに :id を持たせない）。
 * 未設定ユーザーは null を返し、use-case が既定値にフォールバックする（AC-1）。
 */
export interface NotificationSettingsRepositoryInterface {
  findByUser(userId: string): Promise<NotificationSettings | null>;
  save(settings: NotificationSettings): Promise<void>;
}
