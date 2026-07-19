// slice-16 slack-reminder — API 層（正本: docs/spec/slice-16.md, approved 2026-07-19）
// 短間隔ジョブが run_at(UTC) に「通知すべきユーザー」を抽出し、決定的フェイク notifier へ送る。
// 実 Slack/メールへは送らず、sink（誰に・どのチャネルで）をアサートする（PM 決定 2026-07-15）。
// 画面なし（背景ジョブ）→ ui.spec は免除（ADR-0018）。REST 形状は downstream の通知抽象化層の詳細設計——
// テストは「抽出の意味論」を pin する（run_at→対象ユーザーとチャネル）。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });
const runJob = async (request: import('@playwright/test').APIRequestContext, run_at: string) => {
  const res = await request.post('/jobs/reminder/run', { ...asUser('staff01'), data: { run_at } });
  expect(res.status()).toBe(200);
  return (await res.json()).notified as Array<{ user_id: string; channels: string[] }>;
};
const idsOf = (n: Array<{ user_id: string }>) => n.map((x) => x.user_id).sort();

test.describe('slice-16 slack-reminder [api]', () => {
  // AC-1 短間隔ジョブが「今この時刻に通知すべきユーザー」だけを抽出する（個別スケジュールを立てない）
  test('AC-1 run_at=09:00Z は 18:00 JST 到来の未提出ユーザーだけを抽出する', async ({ request }) => {
    const notified = await runJob(request, '2026-07-15T09:00:00Z');
    // 09:00Z = 18:00 Asia/Tokyo。ru_tokyo と ru_noslack が対象（ru_sg は別 TZ で未到来・ru_done は提出済み）
    expect(idsOf(notified)).toEqual(['ru_noslack', 'ru_tokyo']);
  });

  // AC-2 判定はローカル・保存は UTC で一貫（同一ローカル 18:00 でも TZ が違えば抽出される UTC 時刻が違う）
  test('AC-2 同じローカル 18:00 でも別 TZ は別 UTC 時刻に抽出される', async ({ request }) => {
    const at09 = await runJob(request, '2026-07-15T09:00:00Z');
    expect(at09.some((x) => x.user_id === 'ru_sg')).toBe(false); // Asia/Singapore 18:00 は 10:00Z なので 09:00Z では未抽出
    const at10 = await runJob(request, '2026-07-15T10:00:00Z');
    expect(at10.some((x) => x.user_id === 'ru_sg')).toBe(true); // 10:00Z で Asia/Singapore 18:00 が到来
    expect(at10.some((x) => x.user_id === 'ru_tokyo')).toBe(false); // Tokyo は 09:00Z 側
  });

  // AC-3 まずバッジ通知（アプリ内）、Slack/メールは通知設定に従う（OFF には送らない）
  test('AC-3 チャネルは badge＋設定に従う Slack/メール', async ({ request }) => {
    const notified = await runJob(request, '2026-07-15T09:00:00Z');
    const tokyo = notified.find((x) => x.user_id === 'ru_tokyo')!;
    const noslack = notified.find((x) => x.user_id === 'ru_noslack')!;
    expect(tokyo.channels).toContain('badge'); // まずバッジ
    expect(tokyo.channels).toContain('slack'); // slack_enabled=true
    expect(tokyo.channels).not.toContain('email'); // email_enabled=false は送らない
    expect(noslack.channels).toEqual(['badge']); // Slack/メール OFF は badge のみ

    const at10 = await runJob(request, '2026-07-15T10:00:00Z');
    const sg = at10.find((x) => x.user_id === 'ru_sg')!;
    expect(sg.channels).toEqual(expect.arrayContaining(['badge', 'slack', 'email'])); // 両チャネル ON
  });

  // AC-4 報告済み（提出済み）のユーザーにはリマインドを送らない（未報告ステータスと連動）
  test('AC-4 提出済みユーザーは対象にならない', async ({ request }) => {
    const notified = await runJob(request, '2026-07-15T09:00:00Z');
    expect(notified.some((x) => x.user_id === 'ru_done')).toBe(false); // submitted=true は除外
  });
});
