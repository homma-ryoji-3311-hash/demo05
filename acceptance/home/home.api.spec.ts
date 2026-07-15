// slice-07 staff-home — API 層（正本: docs/spec/slice-07.md, approved）
// S2 の集約データ。画面 AC は home.ui.spec.ts（frontend 未実装のため赤が正常）。
import { test, expect } from '@playwright/test';

test.describe('slice-07 staff-home [api]', () => {
  // AC-1 今日の報告状況を返す（下書きがあれば draft_exists）
  test('AC-1 GET /home は下書きがあれば today_status=draft_exists', async ({ request }) => {
    await request.post('/reports', { data: { raw_text: 'ホーム用の下書き', report_date: '2026-07-15' } });
    const res = await request.get('/home');
    expect(res.status()).toBe(200);
    expect((await res.json()).today_status).toBe('draft_exists');
  });

  // AC-2 未確定下書きへの導線を返す
  test('AC-2 未確定下書きへの導線がある', async ({ request }) => {
    await request.post('/reports', { data: { raw_text: '下書き導線', report_date: '2026-07-15' } });
    const body = await (await request.get('/home')).json();
    expect(body.draft).not.toBeNull();
    expect(body.links.drafts).toBeTruthy();
  });

  // AC-3 報告入力への導線を返す
  test('AC-3 報告入力(S3)への導線がある', async ({ request }) => {
    const body = await (await request.get('/home')).json();
    expect(body.links.new_report).toBe('/reports/new');
  });
});
