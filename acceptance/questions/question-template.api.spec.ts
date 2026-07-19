// slice-19 question-template-editor — API 層（正本: docs/spec/slice-19.md, approved 2026-07-19）
// グループ単位の設問セット作成・編集・並べ替え／回答形式・必須・役割タグ／公開ガードレール（必須役割不足は 422）／版管理。
// REST 契約は source: 設計（overview §3）。manager 専用。並列干渉回避: テストごとに別グループ。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });
const q = (format: string, role_tag: string, text: string, required = false) => ({ format, role_tag, text, required });
const valid = [q('short', 'project_key', '案件', true), q('long', 'skill', 'スキル')];

test.describe('slice-19 question-template-editor [api]', () => {
  // AC-1 作成・並べ替えができ、取得時に同じ順序で返る
  test('AC-1 設問セットを作成・並べ替えでき順序が保たれる', async ({ request }) => {
    const created = await request.post('/question-sets', {
      ...asUser('mgr01'),
      data: {
        group_id: 'grp_ac1',
        questions: [q('short', 'project_key', 'A'), q('long', 'skill', 'B'), q('select', 'status', 'C')],
      },
    });
    expect(created.status()).toBe(201);
    const id = (await created.json()).id;
    // 並べ替え（逆順）して保存 → 取得で同じ順序
    const reordered = [q('select', 'status', 'C'), q('long', 'skill', 'B'), q('short', 'project_key', 'A')];
    const put = await request.put(`/question-sets/${id}`, { ...asUser('mgr01'), data: { questions: reordered } });
    expect(put.status()).toBe(200);
    const got = await (await request.get(`/question-sets/${id}`, asUser('mgr01'))).json();
    expect(got.questions.map((x: { text: string }) => x.text)).toEqual(['C', 'B', 'A']);
    expect(got.questions.map((x: { order: number }) => x.order)).toEqual([1, 2, 3]);
  });

  // AC-2 各設問が回答形式・必須/任意・役割タグを保持する（不正な形式/役割は 422）
  test('AC-2 回答形式・必須・役割タグが保存され返る（不正は 422）', async ({ request }) => {
    const created = await request.post('/question-sets', {
      ...asUser('mgr01'),
      data: { group_id: 'grp_ac2', questions: [q('select', 'skill', 'S', true)] },
    });
    expect(created.status()).toBe(201);
    const got = (await created.json()).questions[0];
    expect(got.format).toBe('select');
    expect(got.required).toBe(true);
    expect(got.role_tag).toBe('skill');
    const bad = await request.post('/question-sets', {
      ...asUser('mgr01'),
      data: { group_id: 'grp_ac2', questions: [q('paragraph', 'skill', 'x')] },
    });
    expect(bad.status()).toBe(422);
  });

  // AC-3 公開前ガードレール: 必須役割（project_key・skill）不足は公開を拒否（422・状態不変）
  test('AC-3 必須役割不足は公開をブロックする（422・公開状態にならない）', async ({ request }) => {
    const created = await request.post('/question-sets', {
      ...asUser('mgr01'),
      data: { group_id: 'grp_ac3', questions: [q('short', 'project_key', 'only pk')] }, // skill 役割が無い
    });
    const id = (await created.json()).id;
    const pub = await request.post(`/question-sets/${id}/publish`, asUser('mgr01'));
    expect(pub.status()).toBe(422);
    expect((await pub.json()).missing_roles).toContain('skill');
    const after = await (await request.get(`/question-sets/${id}`, asUser('mgr01'))).json();
    expect(after.status).toBe('draft'); // 公開状態に遷移しない
  });

  // AC-4 版管理: v2 公開後も過去の published v1 は不変（過去報告を壊さない）
  test('AC-4 新版公開後も過去版は不変で残る', async ({ request }) => {
    const before = await (await request.get('/question-sets/qs_seed_v1', asUser('mgr01'))).json();
    expect(before.version).toBe(1);
    // grp_engineer に有効な設問セットを作成→公開（v2 になる）
    const created = await request.post('/question-sets', {
      ...asUser('mgr01'),
      data: { group_id: 'grp_engineer', questions: valid },
    });
    const id = (await created.json()).id;
    const pub = await request.post(`/question-sets/${id}/publish`, asUser('mgr01'));
    expect(pub.status()).toBe(200);
    expect((await pub.json()).version).toBe(2);
    // 過去 v1 は変わらない
    const after = await (await request.get('/question-sets/qs_seed_v1', asUser('mgr01'))).json();
    expect(after.version).toBe(1);
    expect(after.questions).toEqual(before.questions);
  });

  // ロール境界: staff は設問セットを操作できない
  test('staff は設問セット API を操作できない（403）', async ({ request }) => {
    expect(
      (
        await request.post('/question-sets', { ...asUser('staff01'), data: { group_id: 'g', questions: valid } })
      ).status(),
    ).toBe(403);
  });
});
