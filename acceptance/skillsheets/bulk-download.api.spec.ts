// slice-21 bulk-download — API 層（正本: docs/spec/slice-21.md, approved 2026-07-19）
// 最新マスターから全員分を一括生成し ZIP 出力・客先/部署/グループ絞り込み・manager 限定・機械命名・未生成はスキップ＋manifest。
// ZIP は semantics fixture（entries/skipped/manifest 構造で表現。実 ZIP は downstream 詳細設計）。
// 一括管理 bulk_mgr は grp_engineer/grp_sales を担当。bs_3 はマスター未生成（スキップ対象）。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });
const bulk = (request: import('@playwright/test').APIRequestContext, data: Record<string, unknown> = {}) =>
  request.post('/admin/skill-sheets/bulk', { ...asUser('bulk_mgr'), data });

test.describe('slice-21 bulk-download [api]', () => {
  // AC-1 最新マスターから全スタッフ分を一括生成し ZIP（entries）で出力する
  test('AC-1 担当グループの生成可能スタッフが entries にまとまる', async ({ request }) => {
    const body = await (await bulk(request)).json();
    const ids = body.entries.map((e: { staff_id: string }) => e.staff_id).sort();
    expect(ids).toEqual(['bs_1', 'bs_2']); // has_master のみ・bs_3 は未生成で除外
  });

  // AC-2 客先・部署・グループで対象を絞り込める
  test('AC-2 客先/部署/グループで対象を絞り込める', async ({ request }) => {
    const byClient = await (await bulk(request, { client: 'B社' })).json();
    expect(byClient.entries.map((e: { staff_id: string }) => e.staff_id)).toEqual(['bs_2']);
    const byDept = await (await bulk(request, { dept: '開発部' })).json();
    expect(byDept.entries.map((e: { staff_id: string }) => e.staff_id).sort()).toEqual(['bs_1', 'bs_2']);
    const byGroup = await (await bulk(request, { group: 'grp_sales' })).json();
    expect(byGroup.entries.length).toBe(0); // grp_sales は bs_3 のみ＝未生成でスキップ
    expect(byGroup.skipped.map((e: { staff_id: string }) => e.staff_id)).toEqual(['bs_3']);
  });

  // AC-3 manager 権限に限定される（staff は 403）
  test('AC-3 staff は一括生成できない（403）', async ({ request }) => {
    const res = await request.post('/admin/skill-sheets/bulk', { ...asUser('staff01'), data: {} });
    expect(res.status()).toBe(403);
  });

  // AC-4 出力ファイル名を機械的に付与する（[スタッフ名]_[ファイル名]_YYYYMMDD.xlsx）
  test('AC-4 各エントリのファイル名が命名規則に従う', async ({ request }) => {
    const body = await (await bulk(request, { client: 'A社' })).json();
    const e = body.entries.find((x: { staff_id: string }) => x.staff_id === 'bs_1');
    expect(e.filename).toMatch(/^テスト 太郎_スキルシート_\d{8}\.xlsx$/);
  });

  // AC-5 マスター未生成のスタッフはスキップし manifest に記す
  test('AC-5 未生成スタッフはスキップされ manifest に記録される', async ({ request }) => {
    const body = await (await bulk(request)).json();
    expect(body.skipped.some((e: { staff_id: string }) => e.staff_id === 'bs_3')).toBe(true);
    expect(body.manifest.skipped_staff).toContain('bs_3'); // ZIP 同梱の除外者一覧
    expect(body.manifest.generated).toBe(2);
  });
});
