// slice-01 report-draft — API 層の受け入れテスト（正本: docs/spec/slice-01.md, approved）
// 起動先は ACCEPTANCE_BASE_URL。reference-mock(:8000) で緑・実装前 backend(:3000) で赤になる。
import { test, expect } from '@playwright/test';

test.describe('slice-01 report-draft [api]', () => {
  // AC-1 本文を伴う下書きを新規作成できる → 201 / status=draft
  test('AC-1 POST /reports で下書きが作成される（201・draft）', async ({ request }) => {
    const res = await request.post('/reports', {
      data: { raw_text: '本日はダッシュボードの改修を実施。', report_date: '2026-07-15' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'draft' });
    expect(typeof body.id).toBe('string');
  });

  // AC-2 下書き本文を自動保存で更新できる → 200 / draft のまま
  test('AC-2 PATCH /reports/:id で本文を更新できる（200・draft のまま）', async ({ request }) => {
    const created = await request.post('/reports', {
      data: { raw_text: '初稿', report_date: '2026-07-15' },
    });
    const { id } = await created.json();
    const res = await request.patch(`/reports/${id}`, { data: { raw_text: '追記した本文' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'draft', raw_text: '追記した本文' });
  });

  // AC-3 確定済み報告は編集できない → 409（確定後不変）
  test('AC-3 確定済み報告への PATCH は 409', async ({ request }) => {
    const res = await request.patch('/reports/r_seed_confirmed', {
      data: { raw_text: '変更しようとする' },
    });
    expect(res.status()).toBe(409);
  });

  // AC-4 不正な入力は 422（report_date 欠落）
  test('AC-4 report_date を欠いた POST は 422', async ({ request }) => {
    const res = await request.post('/reports', { data: { raw_text: 'x' } });
    expect(res.status()).toBe(422);
  });
});
