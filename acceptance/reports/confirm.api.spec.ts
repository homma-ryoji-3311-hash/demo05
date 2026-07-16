// slice-03 report-confirm — API 層（正本: docs/spec/slice-03.md, approved）
import { test, expect } from '@playwright/test';

async function draftAndSummarize(request: import('@playwright/test').APIRequestContext) {
  const created = await request.post('/reports', {
    data: { raw_text: 'ダッシュボード改修を対応。', report_date: '2026-07-15' },
  });
  const id = (await created.json()).id as string;
  await request.post(`/reports/${id}/summarize`);
  return id;
}

test.describe('slice-03 report-confirm [api]', () => {
  // AC-1 編集した要約で報告を確定できる → confirmed
  test('AC-1 編集済み要約で確定できる（200・confirmed）', async ({ request }) => {
    const id = await draftAndSummarize(request);
    const edited = {
      incidents: [],
      achievements: ['改修を完了'],
      issues: ['再発防止が課題'],
      skills: ['フロントエンド'],
    };
    const res = await request.post(`/reports/${id}/confirm`, { data: { summary: edited } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('confirmed');
    expect(body.confirmed_summary).toMatchObject({ issues: ['再発防止が課題'] });
  });

  // AC-2 確定後は本文・要約が不変（PATCH → 409）
  test('AC-2 確定後の PATCH は 409（不変）', async ({ request }) => {
    const id = await draftAndSummarize(request);
    await request.post(`/reports/${id}/confirm`, {
      data: { summary: { incidents: [], achievements: [], issues: [], skills: [] } },
    });
    const res = await request.patch(`/reports/${id}`, { data: { raw_text: '書き換え' } });
    expect(res.status()).toBe(409);
  });

  // AC-3 二重確定はできない → 409
  test('AC-3 二重確定は 409', async ({ request }) => {
    const id = await draftAndSummarize(request);
    const body = { summary: { incidents: [], achievements: [], issues: [], skills: [] } };
    await request.post(`/reports/${id}/confirm`, { data: body });
    const res = await request.post(`/reports/${id}/confirm`, { data: body });
    expect(res.status()).toBe(409);
  });
});
