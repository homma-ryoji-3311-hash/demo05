// slice-02 report-summarize — API 層（正本: docs/spec/slice-02.md, approved）
import { test, expect } from '@playwright/test';

const KEYS = ['incidents', 'achievements', 'issues', 'skills'] as const;

async function createDraft(request: import('@playwright/test').APIRequestContext, raw_text: string) {
  const r = await request.post('/reports', { data: { raw_text, report_date: '2026-07-15' } });
  return (await r.json()).id as string;
}

test.describe('slice-02 report-summarize [api]', () => {
  // AC-1 下書きを要約すると構造化 JSON が返る
  test('AC-1 POST /reports/:id/summarize は 4カテゴリの JSON を返す（200）', async ({ request }) => {
    const id = await createDraft(request, 'ダッシュボード改修を対応。');
    const res = await request.post(`/reports/${id}/summarize`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const k of KEYS) expect(Array.isArray(body[k])).toBe(true);
  });

  // AC-2 出力は固定スキーマに準拠（4キーのみ）
  test('AC-2 出力は固定スキーマ（4キーのみ）', async ({ request }) => {
    const id = await createDraft(request, 'レビュー指摘を修正。');
    const body = await (await request.post(`/reports/${id}/summarize`)).json();
    expect(Object.keys(body).sort()).toEqual([...KEYS].sort());
  });

  // AC-3 本文にない数値・事実を創作しない（数字なし入力 → 要約にも数字なし）
  test('AC-3 数字を含まない本文の要約に数字が現れない', async ({ request }) => {
    const id = await createDraft(request, '本日はテスト整備とレビュー対応を実施。');
    const body = await (await request.post(`/reports/${id}/summarize`)).json();
    const all = KEYS.flatMap((k) => body[k] as string[]);
    for (const s of all) expect(/\d/.test(s)).toBe(false);
  });

  // AC-4 要約に失敗しても下書きは失われない（502・draft のまま）
  test('AC-4 Summarizer 失敗は 502 で報告は draft のまま', async ({ request }) => {
    const id = await createDraft(request, '__FAIL__ 要約を失敗させる');
    const res = await request.post(`/reports/${id}/summarize`);
    expect(res.status()).toBe(502);
    const rep = await (await request.get(`/reports/${id}`)).json();
    expect(rep.status).toBe('draft');
  });
});
