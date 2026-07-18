// slice-09 skillsheet-view — API 層（正本: docs/spec/slice-09.md, approved 2026-07-18）
// 依存: slice-08（生成済みシートが閲覧の入力）。画面 AC は view.ui.spec.ts（frontend 未実装のため赤が正常）。
// 一覧/履歴は seed 済みの生成済みシート（staff01 に2版・sk_seed_v1/v2）を観測。他人シート(sk_other=staff02)で 403。
import { test, expect } from '@playwright/test';

test.describe('slice-09 skillsheet-view [api]', () => {
  // AC-1/AC-4 自分の生成済みシートを生成日時の新しい順で返す（履歴＝複数版・他人は混ざらない）
  test('AC-1 GET /skill-sheets は自分のシートを新しい順で返す（履歴込み・200）', async ({ request }) => {
    const res = await request.get('/skill-sheets');
    expect(res.status()).toBe(200);
    const list = (await res.json()).sheets;
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(2); // 複数版の履歴が残っている
    // 生成日時の新しい順（created_at 降順）
    const dates = list.map((s: { created_at: string }) => s.created_at);
    expect([...dates].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))).toEqual(dates);
    // 自分のシートのみ（他人の生成物が混ざらない＝deny-by-default）
    for (const s of list) expect(s.staff_id).toBe('staff01');
  });

  // AC-2/AC-4 ダウンロードは元の xlsx を署名付き URL で渡す（プレビュー変換ではない）
  test('AC-2 ダウンロードは元の xlsx を署名付き URL で渡す（200）', async ({ request }) => {
    const list = (await (await request.get('/skill-sheets')).json()).sheets;
    const id = list[0].id; // 自分の最新シート
    const res = await request.get(`/skill-sheets/${id}/download`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.file_url).toMatch(/^https?:\/\/.+/); // 署名付き URL
    expect(body.filename).toMatch(/\.xlsx$/); // 元の xlsx（HTML/PDF 変換でない）
  });

  // AC-5 プレビューは HTML（元 xlsx は渡さない・PM決定）。観測点は content-type と HTML 本体。
  test('AC-5 プレビューは HTML を返す（xlsx でない・200）', async ({ request }) => {
    const list = (await (await request.get('/skill-sheets')).json()).sheets;
    const id = list[0].id;
    const res = await request.get(`/skill-sheets/${id}/preview`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/html');
    const html = await res.text();
    expect(html).toMatch(/<html|<section|<h1/i); // HTML プレビュー（バイナリ xlsx でない）
  });

  // AC-3 他人のシートは閲覧・ダウンロードできない（403）
  test('AC-3 他人のシートのダウンロードは 403', async ({ request }) => {
    const res = await request.get('/skill-sheets/sk_other/download'); // sk_other=staff02 所有
    expect(res.status()).toBe(403);
  });
  test('AC-3 他人のシートのプレビューは 403', async ({ request }) => {
    const res = await request.get('/skill-sheets/sk_other/preview');
    expect(res.status()).toBe(403);
  });

  // AC-4 存在しない ID は 404・未認証は 401
  test('AC-4 存在しない ID のダウンロードは 404', async ({ request }) => {
    const res = await request.get('/skill-sheets/sk_does_not_exist/download');
    expect(res.status()).toBe(404);
    // 実エンドポイントの 404（JSON エラー）であること。未マウント経路の HTML 404 を「緑」にしない（#15 型対策）。
    expect(res.headers()['content-type']).toContain('application/json');
  });
  test('AC-4 未認証の一覧は 401', async ({ request }) => {
    const res = await request.get('/skill-sheets', { headers: { 'X-User-Id': '' } });
    expect(res.status()).toBe(401);
  });
});
