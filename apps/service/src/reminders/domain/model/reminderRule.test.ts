import { describe, expect, it } from 'vitest';
import {
  channelsFor,
  localToUtcHHMM,
  selectDueTargets,
  tzOffsetMin,
  utcHHMM,
  type ReminderTarget,
} from './reminderRule.js';

function target(overrides: Partial<ReminderTarget> = {}): ReminderTarget {
  return {
    id: 'ru',
    timezone: 'Asia/Tokyo',
    remindLocal: '18:00',
    slackEnabled: false,
    emailEnabled: false,
    submitted: false,
    ...overrides,
  };
}

describe('tzOffsetMin / localToUtcHHMM（ローカル判定・保存 UTC・AC-2）', () => {
  it('Asia/Tokyo は +540 分', () => {
    expect(tzOffsetMin('Asia/Tokyo')).toBe(540);
  });
  it('Asia/Singapore は +480 分', () => {
    expect(tzOffsetMin('Asia/Singapore')).toBe(480);
  });
  it('18:00 JST は 09:00Z', () => {
    expect(localToUtcHHMM('18:00', 'Asia/Tokyo')).toBe('09:00');
  });
  it('18:00 Asia/Singapore は 10:00Z（同ローカルでも別 TZ は別 UTC）', () => {
    expect(localToUtcHHMM('18:00', 'Asia/Singapore')).toBe('10:00');
  });
  it('run_at ISO から UTC HH:MM を取り出す', () => {
    expect(utcHHMM('2026-07-15T09:00:00Z')).toBe('09:00');
    expect(utcHHMM('2026-07-15T10:00:00Z')).toBe('10:00');
  });
});

describe('channelsFor（まずバッジ→設定に従う・AC-3）', () => {
  it('両 OFF は badge のみ', () => {
    expect(channelsFor(target())).toEqual(['badge']);
  });
  it('slack ON/email OFF は badge+slack（email は送らない）', () => {
    expect(channelsFor(target({ slackEnabled: true }))).toEqual(['badge', 'slack']);
  });
  it('両 ON は badge+slack+email', () => {
    expect(channelsFor(target({ slackEnabled: true, emailEnabled: true }))).toEqual(['badge', 'slack', 'email']);
  });
});

describe('selectDueTargets（run_at 到来の未提出だけ抽出・AC-1/2/4）', () => {
  const targets: ReminderTarget[] = [
    target({ id: 'ru_tokyo', timezone: 'Asia/Tokyo', slackEnabled: true }),
    target({ id: 'ru_sg', timezone: 'Asia/Singapore', slackEnabled: true, emailEnabled: true }),
    target({ id: 'ru_done', timezone: 'Asia/Tokyo', slackEnabled: true, submitted: true }),
    target({ id: 'ru_noslack', timezone: 'Asia/Tokyo' }),
  ];

  it('09:00Z は 18:00 JST 到来の未提出（tokyo・noslack）だけ・sg は別 TZ で未到来・done は提出済み', () => {
    const notified = selectDueTargets(targets, '09:00');
    expect(notified.map((n) => n.user_id).sort()).toEqual(['ru_noslack', 'ru_tokyo']);
  });

  it('10:00Z は Asia/Singapore 18:00 到来（sg のみ）・tokyo は 09:00Z 側', () => {
    const notified = selectDueTargets(targets, '10:00');
    expect(notified.map((n) => n.user_id)).toEqual(['ru_sg']);
  });

  it('提出済みは抽出されない（AC-4）', () => {
    const notified = selectDueTargets(targets, '09:00');
    expect(notified.some((n) => n.user_id === 'ru_done')).toBe(false);
  });

  it('抽出結果はチャネル付き（noslack は badge のみ・AC-3）', () => {
    const notified = selectDueTargets(targets, '09:00');
    expect(notified.find((n) => n.user_id === 'ru_noslack')?.channels).toEqual(['badge']);
    expect(notified.find((n) => n.user_id === 'ru_tokyo')?.channels).toEqual(['badge', 'slack']);
  });
});
