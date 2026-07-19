import { apiFetch } from '@/common/api/client';

/** 通知設定（backend /notification-settings と等価・snake_case）。時刻は表示ローカル。 */
export interface NotificationSettingsDto {
  remind_time: string; // 表示/判定ローカル（HH:MM）
  remind_time_utc: string; // 保存 UTC（HH:MM）
  slack_enabled: boolean;
  email_enabled: boolean;
  timezone: string;
}

/** 自分の通知設定を取得（slice-13 AC-1）。未ログインは backend が 401 → apiFetch が例外にする。 */
export async function fetchNotificationSettings(): Promise<NotificationSettingsDto> {
  return apiFetch<NotificationSettingsDto>('/notification-settings');
}

/** 自分の通知設定を更新（slice-13 AC-2/AC-3）。remind_time はローカル入力（backend が UTC 正規化）。 */
export async function updateNotificationSettings(input: {
  remind_time: string;
  slack_enabled: boolean;
  email_enabled: boolean;
}): Promise<NotificationSettingsDto> {
  return apiFetch<NotificationSettingsDto>('/notification-settings', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
