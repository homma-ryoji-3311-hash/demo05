// slice-14 admin-console — API 層（正本: docs/spec/slice-14.md, approved 2026-07-19）
// GET /admin/staff（manager 専用）。担当グループのスタッフのみ・?group でタブ絞り込み。可視範囲はバックエンドで強制。
// 報告状況は §3.9 の二値（reported / not_reported）まで。5 ステータスは slice-15、操作の実挙動は slice-09/21。
// REST 契約は source: PM（仕様表で pin）。テスト管理者 admin01 は担当グループ G1/G3、G2 は担当外（遮断検証）。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });

test.describe('slice-14 admin-console [api]', () => {
  // AC-1 管理者は担当グループのスタッフ一覧を取得できる（表示列つき）
  test('AC-1 GET /admin/staff は 200 で担当グループのスタッフを列つきで返す', async ({ request }) => {
    const res = await request.get('/admin/staff', asUser('admin01'));
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.staff)).toBe(true);
    expect(body.staff.length).toBeGreaterThan(0);
    expect(body.groups).toEqual(expect.arrayContaining(['G1', 'G3'])); // 担当グループ（タブ）
    const s = body.staff[0];
    expect(s).toHaveProperty('name');
    expect(s).toHaveProperty('client_name');
    expect(s).toHaveProperty('last_report_at');
    expect(['reported', 'not_reported']).toContain(s.report_status); // §3.9 の二値
    expect(typeof s.has_latest_sheet).toBe('boolean');
  });

  // AC-2 担当グループ外(G2)のスタッフはバックエンドで除外される
  test('AC-2 担当外グループ(G2)のスタッフは応答に一切含まれない', async ({ request }) => {
    const body = await (await request.get('/admin/staff', asUser('admin01'))).json();
    expect(body.staff.every((s: { group_id: string }) => s.group_id !== 'G2')).toBe(true);
    expect(body.staff.some((s: { id: string }) => s.id === 's_g2_a')).toBe(false);
  });

  // AC-3 グループ別タブで絞り込める（?group=G1 は G1 のみ・担当外は選択肢に出ない）
  test('AC-3 ?group=G1 は G1 のスタッフだけを返す', async ({ request }) => {
    const body = await (await request.get('/admin/staff?group=G1', asUser('admin01'))).json();
    expect(body.staff.length).toBeGreaterThan(0);
    expect(body.staff.every((s: { group_id: string }) => s.group_id === 'G1')).toBe(true);
    expect(body.groups).not.toContain('G2'); // 担当外グループはタブ（選択肢）に現れない
  });

  // AC-4 staff ロールはこの一覧を取得できない（ロール境界）
  test('AC-4 staff ロールは 403', async ({ request }) => {
    const res = await request.get('/admin/staff', asUser('staff01'));
    expect(res.status()).toBe(403);
  });
});
