// slice-22 group-settings — API 層（正本: docs/spec/slice-22.md, approved 2026-07-19）
// グループ固有部分（設問セット版・様式・タブ）を設定データで切替（設定駆動・コード分岐なし）。変更は翌日以降に適用・
// 確定済み過去報告は不変・移管後も過去は元グループの不変履歴。編集は担当 manager のみ（担当外/staff は 403）。
// gs_mgr は grp_a/grp_c を担当。mgr01 は非担当（403 検証）。rs_past は過去の確定報告スナップショット（grp_a）。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });

test.describe('slice-22 group-settings [api]', () => {
  // AC-1 グループ固有部分が設定データで切り替わる（A と B で異なる）
  test('AC-1 グループごとに設問セット版・様式・タブが設定から解決される', async ({ request }) => {
    const a = await (await request.get('/groups/grp_a/settings', asUser('gs_mgr'))).json();
    const b = await (await request.get('/groups/grp_b/settings', asUser('gs_mgr'))).json();
    // 並列安全: version は AC-3/AC-4 が grp_a を書き換えるため判定に使わない。不変な template_style で「グループ固有」を確認。
    expect(a.template_style).toBe('style_default');
    expect(b.question_set_version).toBe('v1');
    expect(b.template_style).toBe('style_marketer');
    expect(a.template_style).not.toBe(b.template_style); // グループ固有（設定データで切替）
  });

  // AC-2 コードに分岐を埋めず設定で切り替える（新グループ C を設定追加だけで解決）
  test('AC-2 新グループ C は設定追加だけで解決される（コード分岐なし）', async ({ request }) => {
    const before = await request.get('/groups/grp_c/settings', asUser('gs_mgr'));
    expect(before.status()).toBe(404); // まだ設定が無い
    const put = await request.put('/groups/grp_c/settings', {
      ...asUser('gs_mgr'),
      data: { question_set_version: 'v1', template_style: 'style_c', tab_label: '新規' },
    });
    expect(put.status()).toBe(200);
    const after = await (await request.get('/groups/grp_c/settings', asUser('gs_mgr'))).json();
    expect(after.question_set_version).toBe('v1');
    expect(after.template_style).toBe('style_c'); // 設定データのみで新グループが利用可能に
  });

  // AC-3 設定変更は翌日以降に適用され、確定済み過去報告は不変
  test('AC-3 設定変更は翌日反映・過去報告スナップショットは不変', async ({ request }) => {
    const past0 = await (await request.get('/report-snapshots/rs_past', asUser('gs_mgr'))).json();
    expect(past0.applied_settings.question_set_version).toBe('v2');
    const put = await request.put('/groups/grp_a/settings', {
      ...asUser('gs_mgr'),
      data: { question_set_version: 'v3' },
    });
    expect(put.status()).toBe(200);
    expect((await put.json()).effective_from).toBeTruthy(); // 翌日以降に適用
    const past1 = await (await request.get('/report-snapshots/rs_past', asUser('gs_mgr'))).json();
    expect(past1.applied_settings.question_set_version).toBe('v2'); // 過去報告は変わらない
  });

  // AC-4 グループ設定の編集は担当 manager に限定される
  test('AC-4 担当外 manager・staff はグループ設定を編集できない（403）', async ({ request }) => {
    expect(
      (await request.put('/groups/grp_a/settings', { ...asUser('mgr01'), data: { tab_label: 'x' } })).status(),
    ).toBe(403); // 非担当 manager
    expect(
      (await request.put('/groups/grp_a/settings', { ...asUser('staff01'), data: { tab_label: 'x' } })).status(),
    ).toBe(403); // staff
    expect(
      (await request.put('/groups/grp_a/settings', { ...asUser('gs_mgr'), data: { tab_label: 'ok' } })).status(),
    ).toBe(200); // 担当 manager
  });

  // AC-5 グループ移管後も過去の確定報告は元グループの不変履歴として残る
  test('AC-5 移管しても過去報告は元グループのまま残る', async ({ request }) => {
    const before = await (await request.get('/report-snapshots/rs_past', asUser('gs_mgr'))).json();
    expect(before.group_id).toBe('grp_a');
    const tr = await request.post('/admin/staff/gs_staff/transfer', {
      ...asUser('gs_mgr'),
      data: { to_group: 'grp_b' },
    });
    expect(tr.status()).toBe(200);
    const after = await (await request.get('/report-snapshots/rs_past', asUser('gs_mgr'))).json();
    expect(after.group_id).toBe('grp_a'); // 過去報告は元グループ A の不変履歴
  });
});
