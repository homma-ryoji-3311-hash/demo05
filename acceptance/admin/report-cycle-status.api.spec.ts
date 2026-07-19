// slice-15 report-cycle-status — API 層（正本: docs/spec/slice-15.md, approved 2026-07-19）
// 5 ステータス（提出済み submitted / 遅延提出 late / 未報告 missing / 報告漏れ unreported_flagged / 欠勤 absent）の
// 判定セマンティクスと遷移を pin する（phase2-design §6）。
//
// 重要（仕様表の明示）: REST パス・エンティティ・スケジュール生成の詳細は phase2-design §7 の実装時詳細設計。
//   本スイートは URL 形状に依存せず「状態遷移」を検証する（オラクルの URL は semantics fixture）。
//   固定時刻型の締切のみ対象。退勤連動・累積換算の閾値・個人単位担当は slice-24 へ。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });
const statusOf = async (request: import('@playwright/test').APIRequestContext, oppId: string) => {
  const body = await (await request.get('/me/report-status', asUser('staff01'))).json();
  return body.opportunities.find((o: { id: string }) => o.id === oppId)?.status;
};

const FIVE = ['submitted', 'late', 'missing', 'unreported_flagged', 'absent'];

test.describe('slice-15 report-cycle-status [api]', () => {
  // AC-1 管理者がスタッフごとに報告サイクルを設定できる（スタッフごとに異なる）
  test('AC-1 管理者はスタッフごとに異なる報告サイクルを設定できる', async ({ request }) => {
    const a = await request.put('/admin/report-cycles/cyc_a', {
      ...asUser('mgr01'),
      data: { cycle: 'daily', deadline_local: '18:00' },
    });
    const b = await request.put('/admin/report-cycles/cyc_b', { ...asUser('mgr01'), data: { cycle: 'weekly' } });
    expect(a.status()).toBe(200);
    expect(b.status()).toBe(200);
    const ra = await (await request.get('/admin/report-cycles/cyc_a', asUser('mgr01'))).json();
    const rb = await (await request.get('/admin/report-cycles/cyc_b', asUser('mgr01'))).json();
    expect(ra.cycle).toBe('daily');
    expect(rb.cycle).toBe('weekly');
    expect(ra.cycle).not.toBe(rb.cycle); // スタッフごとに異なるサイクルを持てる
    // 不正なサイクルは 422
    const bad = await request.put('/admin/report-cycles/cyc_a', { ...asUser('mgr01'), data: { cycle: 'yearly' } });
    expect(bad.status()).toBe(422);
  });

  // AC-2 締切内の確定は「提出済み」、締切後の確定は「遅延提出」
  test('AC-2 締切前の確定は submitted・締切後の確定は late', async ({ request }) => {
    expect(await statusOf(request, 'opp_sub')).toBe('submitted');
    expect(await statusOf(request, 'opp_late')).toBe('late');
  });

  // AC-3 締切後に報告が無ければ「未報告（中立）」で、評価には効かない（自動で報告漏れにならない）
  test('AC-3 締切超過・未確定は missing（中立・自動では報告漏れにならない）', async ({ request }) => {
    expect(await statusOf(request, 'opp_missing')).toBe('missing');
  });

  // AC-4 「報告漏れ」は管理者が実態確認の上で計上して初めて確定する（自動計上でない）
  test('AC-4 管理者の計上で missing→unreported_flagged（人間の確認を一枚）', async ({ request }) => {
    expect(await statusOf(request, 'opp_flag')).toBe('missing'); // 計上前は中立
    const res = await request.post('/admin/report-status/opp_flag/flag-missing', asUser('mgr01'));
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('unreported_flagged');
    expect(await statusOf(request, 'opp_flag')).toBe('unreported_flagged'); // 計上後に確定
  });

  // AC-5 欠勤はスタッフ申告＋管理者承認で付与され、記録として残る（消去でない）
  test('AC-5 管理者承認で absent（記録として残り評価対象外）', async ({ request }) => {
    const res = await request.post('/admin/report-status/opp_absent/approve-absence', asUser('mgr01'));
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('absent');
    expect(await statusOf(request, 'opp_absent')).toBe('absent'); // ステータスとして残る
  });

  // AC-6 本人は自分の履行状況を read-only で閲覧できる（計上・承認などの操作はできない）
  test('AC-6 本人は履行状況を read-only 閲覧・状態変更はできない', async ({ request }) => {
    const body = await (await request.get('/me/report-status', asUser('staff01'))).json();
    expect(Array.isArray(body.opportunities)).toBe(true);
    expect(body.opportunities.length).toBeGreaterThan(0);
    for (const o of body.opportunities) expect(FIVE).toContain(o.status);
    // 本人は報告漏れ計上・欠勤承認ができない（403）
    const flag = await request.post('/admin/report-status/opp_missing/flag-missing', asUser('staff01'));
    expect(flag.status()).toBe(403);
    const absent = await request.post('/admin/report-status/opp_missing/approve-absence', asUser('staff01'));
    expect(absent.status()).toBe(403);
  });
});
