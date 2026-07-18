// slice-10 excel-template-manage — API 層（正本: docs/spec/slice-10.md, approved 2026-07-18）
// テンプレート管理は manager 権限（mgr01）。画面 AC は manage.ui.spec.ts（frontend 未実装のため赤が正常）。
// 有効版切替・履歴は runtime で複数版を作って観測。403/401 は staff01（既定ヘッダ）・空ヘッダで検証。
import { test, expect } from '@playwright/test';

const MGR = { 'X-User-Id': 'mgr01' }; // manager（テンプレート管理権限）
const VALID = { anchor_map: { name: 'B2', project_block: 'A10:F14' } }; // 必須アンカーを含む

test.describe('slice-10 excel-template-manage [api]', () => {
  // AC-1 アンカー検証付きでアップロードでき、版として保存される
  test('AC-1 manager はアンカー付きテンプレートをアップロードできる（201・版保存）', async ({ request }) => {
    const res = await request.post('/templates', { headers: MGR, data: VALID });
    expect(res.status()).toBe(201);
    const t = await res.json();
    expect(t.id).toBeTruthy();
    expect(t.version).toMatch(/^v\d+$/); // 版として保存
    expect(t.anchor_map).toMatchObject({ name: 'B2', project_block: 'A10:F14' }); // アンカーが保持される
  });

  // AC-2 必須アンカーを欠くテンプレートは 422（有効版に登録されない）
  test('AC-2 アンカー欠落のテンプレートは 422', async ({ request }) => {
    const res = await request.post('/templates', { headers: MGR, data: { anchor_map: {} } });
    expect(res.status()).toBe(422);
  });

  // AC-3 有効版を切り替えられ、旧版は履歴として残る（削除されない）
  test('AC-3 有効版切替は指定版を有効にし、旧版を履歴として残す', async ({ request }) => {
    const a = await (await request.post('/templates', { headers: MGR, data: VALID })).json();
    const b = await (await request.post('/templates', { headers: MGR, data: VALID })).json();
    const act = await request.put(`/templates/${a.id}/activate`, { headers: MGR });
    expect(act.status()).toBe(200);
    expect((await act.json()).is_active).toBe(true);

    const list = (await (await request.get('/templates', { headers: MGR })).json()).templates;
    const byId = Object.fromEntries(list.map((t: { id: string }) => [t.id, t]));
    expect(byId[a.id].is_active).toBe(true); // 指定版が有効版
    expect(byId[b.id]).toBeTruthy(); // 旧版 b は削除されず履歴として残る
    expect(byId[b.id].is_active).toBe(false); // 切替で b は有効版でなくなる
  });

  // AC-4 テンプレート管理は manager 権限（staff→403・未認証→401）
  test('AC-4 staff のアップロードは 403', async ({ request }) => {
    const res = await request.post('/templates', { data: VALID }); // 既定ヘッダ staff01（staff）
    expect(res.status()).toBe(403);
  });
  test('AC-4 staff の有効版切替は 403', async ({ request }) => {
    const res = await request.put('/templates/tpl_any/activate', {}); // staff01・権限チェックが id 参照より先
    expect(res.status()).toBe(403);
  });
  test('AC-4 未認証のアップロードは 401', async ({ request }) => {
    const res = await request.post('/templates', { headers: { 'X-User-Id': '' }, data: VALID });
    expect(res.status()).toBe(401);
  });
});
