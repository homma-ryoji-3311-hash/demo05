// slice-17 staff-approval — API 層（正本: docs/spec/slice-17.md, approved 2026-07-19）
// 新規スタッフは deny-by-default（pending）→ super admin の承認で担当（主/副）・チャネル・報告サイクルを設定し active 化。
// 承認主体・承認待ち一覧の可視範囲は super admin（PM 決定 2026-07-15）。主/副の操作差の細部は slice-24。
// 並列干渉回避: テストごとに別 pending ユーザー（pend_ac1 は never-approve）。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });

test.describe('slice-17 staff-approval [api]', () => {
  // AC-1 未承認スタッフは deny-by-default で保護 API を叩けない（バックエンド強制）
  test('AC-1 未承認スタッフの報告フローは 403（deny-by-default）', async ({ request }) => {
    const res = await request.post('/reports', {
      ...asUser('pend_ac1'),
      data: { report_date: '2026-07-15', raw_text: 'x' },
    });
    expect(res.status()).toBe(403);
    // /me は許可（承認待ち画面が自分の状態を知れる）
    const me = await request.get('/me', asUser('pend_ac1'));
    expect(me.status()).toBe(200);
    expect((await me.json()).status).toBe('pending');
  });

  // AC-2 super admin の承認で担当（主/副）・チャネル・報告サイクルが設定される
  test('AC-2 super admin の承認で担当・チャネル・サイクルが紐づく（200）', async ({ request }) => {
    const res = await request.post('/admin/staff/pend_ac2/approve', {
      ...asUser('super01'),
      data: { assignment: { role: 'primary' }, channel: 'SES', cycle: 'daily' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('active');
    expect(body.assignment.role).toBe('primary');
    expect(body.channel).toBe('SES');
    expect(body.cycle).toBe('daily');
    // 不正な担当ロールは 422
    const bad = await request.post('/admin/staff/pend_ac2/approve', {
      ...asUser('super01'),
      data: { assignment: { role: 'boss' } },
    });
    expect(bad.status()).toBe(422);
  });

  // AC-3 承認済みになると deny-by-default が解除される
  test('AC-3 承認後は報告フローに入れる（deny 解除）', async ({ request }) => {
    // 承認前は 403
    const before = await request.post('/reports', {
      ...asUser('pend_ac3'),
      data: { report_date: '2026-07-15', raw_text: 'x' },
    });
    expect(before.status()).toBe(403);
    // super admin が承認
    const appr = await request.post('/admin/staff/pend_ac3/approve', {
      ...asUser('super01'),
      data: { assignment: { role: 'secondary' }, cycle: 'weekly' },
    });
    expect(appr.status()).toBe(200);
    // 承認後は報告作成できる
    const after = await request.post('/reports', {
      ...asUser('pend_ac3'),
      data: { report_date: '2026-07-15', raw_text: 'x' },
    });
    expect(after.status()).toBe(201);
  });

  // AC-4 承認待ち一覧は super admin が取得できる（他ロールには見せない）
  test('AC-4 承認待ち一覧は super admin のみ取得できる', async ({ request }) => {
    const ok = await request.get('/admin/staff/pending', asUser('super01'));
    expect(ok.status()).toBe(200);
    const body = await ok.json();
    expect(body.pending.some((s: { id: string }) => s.id === 'pend_ac1')).toBe(true); // never-approve は必ず一覧に居る
    // manager / staff は一覧を見られない
    expect((await request.get('/admin/staff/pending', asUser('mgr01'))).status()).toBe(403);
    expect((await request.get('/admin/staff/pending', asUser('staff01'))).status()).toBe(403);
  });
});
