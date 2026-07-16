// slice-04 report-list — API 層（正本: docs/spec/slice-04.md, approved）
import { test, expect } from '@playwright/test';

test.describe('slice-04 report-list [api]', () => {
  // AC-1 自分の報告一覧を取得できる（自分のみ）
  test('AC-1 GET /reports は自分の報告のみを返す（200）', async ({ request }) => {
    const a = await (await request.post('/reports', { data: { raw_text: '報告A', report_date: '2026-07-15' } })).json();
    const res = await request.get('/reports');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const ids = body.reports.map((r: any) => r.id);
    expect(ids).toContain(a.id);
    // 他人（staff02）の r_other が混ざらない
    expect(body.reports.every((r: any) => r.user_id === 'staff01')).toBe(true);
  });

  // AC-2 報告詳細で本文と要約を参照できる
  test('AC-2 GET /reports/:id は本文を含む詳細を返す（200）', async ({ request }) => {
    const a = await (
      await request.post('/reports', { data: { raw_text: '詳細本文', report_date: '2026-07-15' } })
    ).json();
    const res = await request.get(`/reports/${a.id}`);
    expect(res.status()).toBe(200);
    expect((await res.json()).raw_text).toBe('詳細本文');
  });

  // AC-3 他人の報告は参照できない（403）
  test('AC-3 他人の報告は 403', async ({ request }) => {
    const res = await request.get('/reports/r_other');
    expect(res.status()).toBe(403);
  });
});
