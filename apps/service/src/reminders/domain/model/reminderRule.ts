import type { DomainError } from '../../../common/error/domainError.js';

/** 通知チャネル（まずバッジ→設定に従い Slack/メール・slice-16 AC-3）。 */
export type ReminderChannel = 'badge' | 'slack' | 'email';

/** リマインド対象の1ユーザー（slice-13 通知設定＋slice-15 提出状況を内包した抽出源・オラクル reminderUsers と同型）。 */
export interface ReminderTarget {
  id: string;
  timezone: string;
  /** リマインド時刻（ローカル・`HH:MM`）。保存は UTC・判定はローカル（overview §5・AC-2）。 */
  remindLocal: string;
  slackEnabled: boolean;
  emailEnabled: boolean;
  /** 提出済み（＝未報告になりえない）。true は抽出対象外（AC-4）。 */
  submitted: boolean;
}

/** ジョブが返す sink の1件（誰に・どのチャネルで）。HTTP レスポンス形（snake_case・オラクルと同一キー）。 */
export interface NotifiedEntry {
  user_id: string;
  channels: ReminderChannel[];
}

/**
 * TZ の UTC オフセット（分）。オラクル remindTzOffsetMin と同一（Intl・固定日 2026-07-15 基準）。
 * DST を持つ TZ でも固定日で一意に定まる（合成フィクスチャは固定時刻型のみ・退勤連動は後続）。
 */
export function tzOffsetMin(tz: string): number {
  const at = new Date('2026-07-15T00:00:00Z');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** ローカル `HH:MM` を UTC `HH:MM` に換算（オラクル localToUtcHHMM と同一・AC-2）。 */
export function localToUtcHHMM(hhmm: string, tz: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const total = (((Number(hStr) * 60 + Number(mStr) - tzOffsetMin(tz)) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** UTC の instant（ISO 文字列）から `HH:MM` を取り出す（run_at → 抽出キー）。 */
export function utcHHMM(instant: string): string {
  const d = new Date(instant);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** まずバッジ→設定に従い Slack/メール（AC-3・オラクル reminderChannels と同一）。 */
export function channelsFor(t: ReminderTarget): ReminderChannel[] {
  const channels: ReminderChannel[] = ['badge'];
  if (t.slackEnabled) channels.push('slack');
  if (t.emailEnabled) channels.push('email');
  return channels;
}

/**
 * run_at(UTC `HH:MM`) に「今この時刻に通知すべきユーザー」だけを抽出する（AC-1/2/4）。
 * - 提出済みは除外（AC-4）。
 * - 各ユーザーのローカル時刻を UTC 換算して run_at と一致で到来判定（同ローカルでも別 TZ は別 UTC・AC-2）。
 * 個別スケジュールを立てず、実行時刻に DB を1回引く純関数（実スケジューラは downstream）。
 */
export function selectDueTargets(targets: ReminderTarget[], runHHMM: string): NotifiedEntry[] {
  return targets
    .filter((t) => !t.submitted)
    .filter((t) => localToUtcHHMM(t.remindLocal, t.timezone) === runHHMM)
    .map((t) => ({ user_id: t.id, channels: channelsFor(t) }));
}

/** run_at 欠落・不正など入力検証の失敗。kind=validation → 422（オラクルの validation_failed と同義）。 */
export class ReminderValidationError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor(field: string) {
    super(`validation failed: ${field}`);
    this.name = 'ReminderValidationError';
  }
}

/** Prisma 永続化が未配線（マイグレーション待ち・統合役）。kind=internal → 500。 */
export class ReminderPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`reminder persistence not wired: ${operation} awaits migration (統合役)`);
    this.name = 'ReminderPersistenceUnavailableError';
  }
}
