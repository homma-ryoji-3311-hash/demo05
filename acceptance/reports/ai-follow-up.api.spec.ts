// slice-23 ai-follow-up-question — API 層（正本: docs/spec/slice-23.md, approved 2026-07-19）
// 要約後に薄い項目（ルール検出＝決定的）へ一度だけ追加質問／回答は本文へ追記し要約作り直し（下書きのまま）／
// 必須未回答は確定ブロック(422)・任意はスキップ可／質問が出せなかった degrade は必須ブロックを発動しない／二重質問しない。
// 【決定】のみ AC 化（しきい値・優先順位・データモデル等の精緻化は slice-26 へ段階送り）。
// summarize は issues を常に空にするため、対象カテゴリ issues が「薄い」と決定的に検出される。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });
type Req = import('@playwright/test').APIRequestContext;
async function draftSummarized(request: Req, raw = '午前は作業を実施。'): Promise<string> {
  const r = await request.post('/reports', {
    ...asUser('staff01'),
    data: { report_date: '2026-07-15', raw_text: raw },
  });
  const id = (await r.json()).id as string;
  await request.post(`/reports/${id}/summarize`, asUser('staff01'));
  return id;
}

test.describe('slice-23 ai-follow-up-question [api]', () => {
  // AC-1 要約後に薄い項目へ一度だけ追加質問する（決定的）
  test('AC-1 薄い issues に対して追加質問が一度だけ生成される', async ({ request }) => {
    const id = await draftSummarized(request);
    const fu = await (await request.post(`/reports/${id}/follow-up`, { ...asUser('staff01'), data: {} })).json();
    expect(fu.state).toBe('asked');
    expect(typeof fu.question).toBe('string');
    expect(fu.question.length).toBeGreaterThan(0);
  });

  // AC-2 回答を本文へ追記し要約を作り直す（下書きのまま）
  test('AC-2 回答は raw_text へ追記され要約が作り直される（draft のまま）', async ({ request }) => {
    const id = await draftSummarized(request);
    await request.post(`/reports/${id}/follow-up`, { ...asUser('staff01'), data: {} });
    const ans = await request.post(`/reports/${id}/follow-up/answer`, {
      ...asUser('staff01'),
      data: { answer: '××の手順で△△を設定した' },
    });
    expect(ans.status()).toBe(200);
    const body = await ans.json();
    expect(body.raw_text).toContain('××の手順で△△を設定した'); // 本文へ追記
    expect(body.status).toBe('draft'); // 下書きのまま
    const detail = await (await request.get(`/reports/${id}`, asUser('staff01'))).json();
    expect(detail.raw_text).toContain('××の手順で△△を設定した'); // 要約作り直しの元本文
  });

  // AC-3 必須未回答は確定ブロック・任意はスキップ可
  test('AC-3 必須未回答は確定ブロック(422)・回答後は確定可・任意はスキップ可', async ({ request }) => {
    // 必須: 未回答で確定ブロック
    const idR = await draftSummarized(request);
    await request.post(`/reports/${idR}/follow-up`, { ...asUser('staff01'), data: { required: true } });
    const blocked = await request.post(`/reports/${idR}/confirm`, { ...asUser('staff01'), data: {} });
    expect(blocked.status()).toBe(422);
    // 回答すれば確定できる
    await request.post(`/reports/${idR}/follow-up/answer`, { ...asUser('staff01'), data: { answer: '回答内容' } });
    const okAfter = await request.post(`/reports/${idR}/confirm`, { ...asUser('staff01'), data: {} });
    expect(okAfter.status()).toBe(200);
    // 任意: 未回答でもスキップして確定できる
    const idO = await draftSummarized(request);
    await request.post(`/reports/${idO}/follow-up`, { ...asUser('staff01'), data: { required: false } });
    const okOptional = await request.post(`/reports/${idO}/confirm`, { ...asUser('staff01'), data: {} });
    expect(okOptional.status()).toBe(200);
  });

  // AC-4 質問自体が出せなかった degrade 時は必須ブロックを発動しない
  test('AC-4 degrade（質問未提示）は必須ブロックを発動せず確定できる', async ({ request }) => {
    const id = await draftSummarized(request, '午前は作業。__FOLLOWUP_DEGRADE__');
    const fu = await (
      await request.post(`/reports/${id}/follow-up`, { ...asUser('staff01'), data: { required: true } })
    ).json();
    expect(fu.state).toBe('degraded'); // 質問自体が生成・提示されなかった
    const ok = await request.post(`/reports/${id}/confirm`, { ...asUser('staff01'), data: {} });
    expect(ok.status()).toBe(200); // 「問われていない」状態を確定不能にしない
  });

  // AC-5 対話は一度きりで二重質問しない
  test('AC-5 再要求しても新しい質問ラウンドは走らない', async ({ request }) => {
    const id = await draftSummarized(request);
    const first = await (await request.post(`/reports/${id}/follow-up`, { ...asUser('staff01'), data: {} })).json();
    const second = await (await request.post(`/reports/${id}/follow-up`, { ...asUser('staff01'), data: {} })).json();
    expect(second.state).toBe(first.state);
    expect(second.question).toBe(first.question); // 二重質問しない（同一を返す）
  });
});
