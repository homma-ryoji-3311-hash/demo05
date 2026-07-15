// slice-05 previous-reference — API 層（正本: docs/spec/slice-05.md, approved）
import { test, expect } from '@playwright/test';

test.describe('slice-05 previous-reference [api]', () => {
  // AC-1 前回の確定報告を読み取り専用で取得できる（staff01 は r_seed_confirmed を持つ）
  test('AC-1 GET /reports/:id/previous は直近の確定報告を返す（200）', async ({ request }) => {
    const created = await (
      await request.post('/reports', { data: { raw_text: '本日分', report_date: '2026-07-15' } })
    ).json();
    const res = await request.get(`/reports/${created.id}/previous`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.previous).not.toBeNull();
    expect(typeof body.previous.raw_text).toBe('string');
  });

  // AC-2 前回が存在しない場合は「なし」を返す（前回確定のない fresh ユーザー）
  test('AC-2 前回が無ければ previous: null（200）', async ({ request }) => {
    const headers = { 'X-User-Id': 'staff_fresh' };
    const created = await (
      await request.post('/reports', { data: { raw_text: '初回', report_date: '2026-07-15' }, headers })
    ).json();
    const res = await request.get(`/reports/${created.id}/previous`, { headers });
    expect(res.status()).toBe(200);
    expect((await res.json()).previous).toBeNull();
  });
});
