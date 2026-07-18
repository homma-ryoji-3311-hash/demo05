// slice-02 report-summarize — API 層（正本: docs/spec/slice-02.md, approved）
//
// #15 の工程4 翻訳欠陥修正（2026-07-18）: 旧テストは「要約しない空スタブ」を 4/4 通していた（緑 ≠ 仕様充足）。
//   - AC-1 は Array.isArray だけ→空配列でも真。本文由来の内容が入ることを固定する。
//   - AC-3 は all が空だと for が0回＝空振り合格。件数ガードを置き「中身がある前提」で数字なしを見る。
//   アサートはオラクル（server.mjs: `要約: <slice>` 形）と backend の FakeSummarizer（文抽出形）の
//   両方が満たす実質だけに絞る（出力フォーマットは両者で異なるため、語の由来と非空性で固定）。
import { test, expect } from '@playwright/test';

const KEYS = ['incidents', 'achievements', 'issues', 'skills'] as const;

async function createDraft(request: import('@playwright/test').APIRequestContext, raw_text: string) {
  const r = await request.post('/reports', { data: { raw_text, report_date: '2026-07-15' } });
  return (await r.json()).id as string;
}

test.describe('slice-02 report-summarize [api]', () => {
  // AC-1 下書きを要約すると本文由来の内容を含む構造化 JSON が返る（空要約スタブを落とす）
  test('AC-1 POST /reports/:id/summarize は本文由来の内容を含む 4カテゴリ JSON を返す（200）', async ({ request }) => {
    const id = await createDraft(request, 'ダッシュボードの改修を対応した。');
    const res = await request.post(`/reports/${id}/summarize`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const k of KEYS) expect(Array.isArray(body[k])).toBe(true);
    // 何かしら要約された（全カテゴリ空を返すスタブは落ちる）
    const items = KEYS.flatMap((k) => body[k] as string[]);
    expect(items.length).toBeGreaterThan(0);
    // 本文の語が要約に現れる＝入力由来（オラクル「要約: …改修…」／backend「…改修…」の両方が満たす）
    expect(body.achievements.length).toBeGreaterThan(0);
    expect(body.achievements.join('')).toContain('改修');
    // スキル抽出も働く（本文の「ダッシュボード」由来。両オラクルとも非空）
    expect(body.skills.length).toBeGreaterThan(0);
  });

  // AC-2 出力は固定スキーマに準拠（4キーのみ）
  test('AC-2 出力は固定スキーマ（4キーのみ）', async ({ request }) => {
    const id = await createDraft(request, 'レビュー指摘を修正。');
    const body = await (await request.post(`/reports/${id}/summarize`)).json();
    expect(Object.keys(body).sort()).toEqual([...KEYS].sort());
  });

  // AC-3 本文にない数値・事実を創作しない（数字なし入力 → 要約にも数字なし）。
  // 空振り防止: 中身がある前提で初めて「数字が無い」に意味が出る。
  test('AC-3 数字を含まない本文の要約は中身があり、かつ数字が現れない', async ({ request }) => {
    const id = await createDraft(request, 'レビュー対応とテスト整備を実施した。');
    const body = await (await request.post(`/reports/${id}/summarize`)).json();
    const all = KEYS.flatMap((k) => body[k] as string[]);
    expect(all.length).toBeGreaterThan(0); // ← 空振り合格を防ぐガード
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
