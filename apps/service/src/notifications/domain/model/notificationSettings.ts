import type { DomainError } from '../../../common/error/domainError.js';

/** 保存・復元用のプレーン表現（時刻は保存 UTC）。HTTP レスポンス形はコントローラで snake_case + 表示ローカルに変換。 */
export interface NotificationSettingsProps {
  userId: string;
  remindTimeUtc: string; // 'HH:MM'（保存 UTC・spec.md §3.8）
  slackEnabled: boolean;
  emailEnabled: boolean;
}

/** GET/PUT の HTTP レスポンス形（snake_case）。オラクル(server.mjs notificationView)と同一キー。 */
export interface NotificationSettingsView {
  remind_time: string; // 表示/判定ローカル（AC-3）
  remind_time_utc: string; // 保存 UTC（往復検証で下流に UTC 正規化を強制・AC-3）
  slack_enabled: boolean;
  email_enabled: boolean;
  timezone: string;
}

/** 24h "HH:MM"。外れは 422（AC-2）。オラクル HHMM と同一。 */
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** 未設定時の既定（AC-1）。09:00Z は Asia/Tokyo で 18:00。オラクル DEFAULT_NOTIFICATION と同一。 */
export const DEFAULT_REMIND_TIME_UTC = '09:00';

/** IANA tz の UTC オフセット（分）。固定参照時刻で決定的に算出（Asia/Tokyo=+540）。オラクル tzOffsetMin と同一。 */
export function tzOffsetMin(tz: string): number {
  const at = new Date('2026-07-15T00:00:00Z');
  const map: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)) {
    map[part.type] = part.value;
  }
  const asLocal = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return Math.round((asLocal - at.getTime()) / 60000);
}

function hhmmToMin(hhmm: string): number {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}
function minToHhmm(min: number): string {
  const x = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
}
/** 入力ローカル → 保存 UTC。 */
export function localToUtc(hhmm: string, tz: string): string {
  return minToHhmm(hhmmToMin(hhmm) - tzOffsetMin(tz));
}
/** 保存 UTC → 表示ローカル。 */
export function utcToLocal(hhmm: string, tz: string): string {
  return minToHhmm(hhmmToMin(hhmm) + tzOffsetMin(tz));
}

/**
 * 通知設定（slice-13）。リマインド時刻は「保存 UTC・表示/判定ローカル」（spec.md §3.8・CLAUDE.md 原則9）。
 * 設定は user_id に紐づき本人のみ（認可は route の authUserId が 401・専用パスに :id を持たせない）。
 */
export class NotificationSettings {
  private constructor(private props: NotificationSettingsProps) {}

  /** 未設定ユーザーの既定（AC-1）。Slack ON・メール OFF・remind 09:00Z（Tokyo で 18:00）。 */
  static default(userId: string): NotificationSettings {
    return new NotificationSettings({
      userId,
      remindTimeUtc: DEFAULT_REMIND_TIME_UTC,
      slackEnabled: true,
      emailEnabled: false,
    });
  }

  static reconstruct(props: NotificationSettingsProps): NotificationSettings {
    return new NotificationSettings(props);
  }

  /** 更新（AC-2/AC-3）。remind_time はローカル入力 → 保存 UTC へ正規化。不正な時刻形式は 422。Slack/メールは省略時据え置き。 */
  update(input: { remindTimeLocal: unknown; slackEnabled: unknown; emailEnabled: unknown }, tz: string): void {
    if (typeof input.remindTimeLocal !== 'string' || !HHMM.test(input.remindTimeLocal)) {
      throw new NotificationSettingsValidationError('remind_time must be HH:MM');
    }
    this.props = {
      ...this.props,
      remindTimeUtc: localToUtc(input.remindTimeLocal, tz),
      slackEnabled: typeof input.slackEnabled === 'boolean' ? input.slackEnabled : this.props.slackEnabled,
      emailEnabled: typeof input.emailEnabled === 'boolean' ? input.emailEnabled : this.props.emailEnabled,
    };
  }

  /** 表示ローカル + 保存 UTC の両方を返す（AC-3・下流に UTC 正規化を強制）。 */
  toView(tz: string): NotificationSettingsView {
    return {
      remind_time: utcToLocal(this.props.remindTimeUtc, tz),
      remind_time_utc: this.props.remindTimeUtc,
      slack_enabled: this.props.slackEnabled,
      email_enabled: this.props.emailEnabled,
      timezone: tz,
    };
  }

  toPersistence(): NotificationSettingsProps {
    return { ...this.props };
  }

  get userId(): string {
    return this.props.userId;
  }
}

/** 不正な時刻形式など入力検証の失敗。kind=validation → 422（CLAUDE.md §6・保存しない）。 */
export class NotificationSettingsValidationError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor(message: string) {
    super(message);
    this.name = 'NotificationSettingsValidationError';
  }
}

/** Prisma 永続化が未配線（NotificationSettings モデルのマイグレーション待ち・統合役）。kind=internal → 500。 */
export class NotificationSettingsPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`notification-settings persistence not wired: ${operation} awaits migration (統合役)`);
    this.name = 'NotificationSettingsPersistenceUnavailableError';
  }
}
