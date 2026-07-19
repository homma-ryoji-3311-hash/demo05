import { useEffect, useState } from 'react';
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  type NotificationSettingsDto,
} from '../api/notificationsApi';

/**
 * S9 通知設定（slice-13）。
 * - リマインド時刻を入力・変更できるフォーム（AC-1/AC-2）。
 * - Slack 通知・メール通知の ON/OFF をそれぞれ切り替えられる（AC-3 の設定・チャネル分岐）。
 * - 現在のタイムゾーンをローカル時刻としてテキスト表示（どの TZ で解釈されるか分かる・色のみに頼らない）。
 * 変更は即 PUT（backend が保存 UTC へ正規化し、表示はローカルへ戻す）。
 */
type LoadState = 'loading' | 'ready' | 'failed';

export function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettingsDto | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let active = true;
    void fetchNotificationSettings()
      .then((data) => {
        if (!active) return;
        setSettings(data);
        setState('ready');
      })
      .catch(() => {
        if (active) setState('failed');
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(next: NotificationSettingsDto): Promise<void> {
    setSettings(next); // 楽観更新（入力の即時反映）
    try {
      const saved = await updateNotificationSettings({
        remind_time: next.remind_time,
        slack_enabled: next.slack_enabled,
        email_enabled: next.email_enabled,
      });
      setSettings(saved); // backend の正規化結果（表示ローカル）で確定
    } catch {
      setState('failed');
    }
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 text-2xl font-bold">通知設定</h1>

      {state === 'loading' && (
        <p role="status" aria-live="polite">
          読み込んでいます
        </p>
      )}
      {state === 'failed' && <p role="alert">通知設定を取得できませんでした。再試行してください</p>}

      {settings && (
        <form className="flex max-w-md flex-col gap-4">
          <label className="flex flex-col gap-1">
            リマインド時刻
            <input
              type="time"
              value={settings.remind_time}
              onChange={(e) => void save({ ...settings, remind_time: e.target.value })}
              className="rounded border px-2 py-1"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.slack_enabled}
              onChange={(e) => void save({ ...settings, slack_enabled: e.target.checked })}
            />
            Slack通知
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.email_enabled}
              onChange={(e) => void save({ ...settings, email_enabled: e.target.checked })}
            />
            メール通知
          </label>

          {/* TZ をテキストで示す（色のみに頼らない・どの TZ で解釈されるか分かる）。 */}
          <p className="text-sm text-gray-700">
            タイムゾーン: {settings.timezone}（リマインド時刻はこのローカル時刻で解釈されます）
          </p>
        </form>
      )}
    </main>
  );
}
