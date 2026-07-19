// slice-20 wellbeing-soft-questions — API 層（正本: docs/spec/slice-20.md, approved 2026-07-19）
// ソフト設問の役割別処理（AI活用→スキル／課題・所感→内部非反映／雑感→完全除外）。雑感は AI 変換・シート反映から
// 完全除外・閲覧限定（本人・担当manager・メンタルケア担当）・スコア化禁止・任意入力/本人非公開可。
// 並列干渉回避: 各テストが自分の報告を作る。閲覧ロール: staff01(本人)/mgr01(担当)/care01(ケア)/mgr_other(担当外)。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });
type Req = import('@playwright/test').APIRequestContext;
async function draftWithSoft(request: Req, soft: Record<string, unknown>): Promise<string> {
  const r = await request.post('/reports', {
    ...asUser('staff01'),
    data: { report_date: '2026-07-15', raw_text: '午前は環境構築。' },
  });
  const id = (await r.json()).id as string;
  await request.post(`/reports/${id}/soft-answers`, { ...asUser('staff01'), data: soft });
  return id;
}

test.describe('slice-20 wellbeing-soft-questions [api]', () => {
  // AC-1 ソフト設問が役割で流れ先を分ける（AI活用→スキル／雑感→除外）
  test('AC-1 AI活用はスキルへ反映され、雑感は要約に出ない', async ({ request }) => {
    const id = await draftWithSoft(request, {
      ai_use: 'CI生成に活用',
      issue: 'レビュー往復',
      shokan: '所感テキスト',
      zakkan: 'ZAKKAN_ROUTING',
    });
    const sum = await (await request.post(`/reports/${id}/summarize`, asUser('staff01'))).json();
    expect(sum.skills.join(' ')).toContain('CI生成に活用'); // AI活用→スキル
    expect(JSON.stringify(sum)).not.toContain('ZAKKAN_ROUTING'); // 雑感はウェルビーイングとして後段へ渡さない
  });

  // AC-2 雑感は AI 変換・シート反映から完全に除外される（Summarizer に一切渡らない）
  test('AC-2 雑感は要約にも soft-answers 応答にも一切現れない', async ({ request }) => {
    const id = await draftWithSoft(request, { zakkan: 'ZAKKAN_SECRET' });
    const sum = await (await request.post(`/reports/${id}/summarize`, asUser('staff01'))).json();
    expect(JSON.stringify(sum)).not.toContain('ZAKKAN_SECRET');
    const sa = await request.post(`/reports/${id}/soft-answers`, {
      ...asUser('staff01'),
      data: { zakkan: 'ZAKKAN_ECHO' },
    });
    expect(JSON.stringify(await sa.json())).not.toContain('ZAKKAN_ECHO'); // 応答にも雑感を出さない
  });

  // AC-3 雑感は任意入力・本人非公開可で、閲覧は最小ロールに限定される
  test('AC-3 限定閲覧は最小ロールのみ・担当外は 403・private は本人のみ', async ({ request }) => {
    const id = await draftWithSoft(request, { zakkan: '雑感限定', zakkan_visibility: 'limited' });
    expect((await request.get(`/reports/${id}/zakkan`, asUser('staff01'))).status()).toBe(200); // 本人
    expect((await request.get(`/reports/${id}/zakkan`, asUser('mgr01'))).status()).toBe(200); // 担当 manager
    expect((await request.get(`/reports/${id}/zakkan`, asUser('care01'))).status()).toBe(200); // メンタルケア担当
    expect((await request.get(`/reports/${id}/zakkan`, asUser('mgr_other'))).status()).toBe(403); // 担当外 manager
    // 本人非公開（private）は担当 manager でも見られない（本人のみ）
    const idp = await draftWithSoft(request, { zakkan: '秘密雑感', zakkan_visibility: 'private' });
    expect((await request.get(`/reports/${idp}/zakkan`, asUser('staff01'))).status()).toBe(200);
    expect((await request.get(`/reports/${idp}/zakkan`, asUser('mgr01'))).status()).toBe(403);
  });

  // AC-4 AI は状態の診断・点数化をしない（スコア・診断のフィールドが存在しない）
  test('AC-4 要約にも雑感応答にもスコア・診断が存在しない', async ({ request }) => {
    const id = await draftWithSoft(request, { ai_use: 'x', zakkan: '疲れ気味' });
    const sum = await (await request.post(`/reports/${id}/summarize`, asUser('staff01'))).json();
    const za = await (await request.get(`/reports/${id}/zakkan`, asUser('staff01'))).json();
    for (const k of ['score', 'diagnosis', 'mental_score', '点数', 'スコア']) {
      expect(Object.keys(sum)).not.toContain(k);
      expect(Object.keys(za)).not.toContain(k);
    }
  });
});
