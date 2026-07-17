// slice-07 staff-home — API 層（正本: docs/spec/slice-07.md, approved）
// S2 の集約データ。画面 AC は home.ui.spec.ts（frontend 未実装のため赤が正常）。
//
// #26 の工程4 翻訳欠陥修正（2026-07-18）:
//   - PM決定 Option A: today_status は report_date を無視して集約（日付非依存）。「今日」は当日フィルタではない（D-2）。
//   - 3分岐（none/draft_exists/confirmed）を別々に固定し、レスポンス丸ごとハードコードのスタブを落とす（D-3）。
//   - draft は id まで固定（`.not.toBeNull()` は undefined を通すので使わない・D-4）。
//   - 変異は専用の使い捨てユーザーに隔離し、共有 staff01 seed を汚さない（D-5）。
//   - seed パリティ差（オラクルは r_seed_draft を持たない／backend は r_other を持たない・oracle-seed-parity-gap）を
//     避けるため、状態は seed 依存ではなく実行時に該当ユーザーで作る（none は無報告ユーザー）。
import { test, expect } from '@playwright/test';

test.describe('slice-07 staff-home [api]', () => {
  // AC-1/AC-2 下書きがあれば today_status=draft_exists、その下書きへの導線（links.drafts）を返す。
  test('AC-1/AC-2 下書きありは draft_exists＋当該下書きへの導線', async ({ request }) => {
    const u = 'home_draft_user'; // 専用ユーザー（共有 staff01 を汚さない・D-5）
    const created = await request.post('/reports', {
      headers: { 'X-User-Id': u },
      data: { raw_text: 'ホーム用の下書き', report_date: '2026-07-15' },
    });
    expect(created.status()).toBe(201); // arrange の成否も検証する
    const draftId = (await created.json()).id;

    const res = await request.get('/home', { headers: { 'X-User-Id': u } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.today_status).toBe('draft_exists');
    expect(body.draft.id).toBe(draftId); // D-4: draft の存在ではなく id を固定
    expect(body.links.drafts).toBe(`/reports/${draftId}`); // AC-2 未確定下書きへの導線
  });

  // AC-1 分岐: 報告が1件も無いユーザーは none（下書きも導線も無い）。
  test('AC-1 分岐: 無報告ユーザーは today_status=none', async ({ request }) => {
    const res = await request.get('/home', { headers: { 'X-User-Id': 'home_empty_user' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.today_status).toBe('none');
    expect(body.draft).toBeNull();
    expect(body.links.drafts).toBeNull();
  });

  // AC-1 分岐: 下書きが無く確定済みのみのユーザーは confirmed。
  // 実行時に確定まで進めるので seed パリティに依存しない（別ユーザーで隔離）。
  test('AC-1 分岐: 確定のみのユーザーは today_status=confirmed', async ({ request }) => {
    const u = 'home_confirmed_user';
    const created = await request.post('/reports', {
      headers: { 'X-User-Id': u },
      data: { raw_text: '確定済みにする本文', report_date: '2026-07-14' },
    });
    const id = (await created.json()).id;
    await request.post(`/reports/${id}/summarize`, { headers: { 'X-User-Id': u } });
    await request.post(`/reports/${id}/confirm`, { headers: { 'X-User-Id': u }, data: {} });

    const res = await request.get('/home', { headers: { 'X-User-Id': u } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.today_status).toBe('confirmed');
    expect(body.draft).toBeNull(); // 確定済みだけなら下書き導線は無い
  });

  // AC-3 報告入力(S3)への導線は常に返る（状態非依存）。
  test('AC-3 報告入力(S3)への導線がある', async ({ request }) => {
    const body = await (await request.get('/home', { headers: { 'X-User-Id': 'home_links_user' } })).json();
    expect(body.links.new_report).toBe('/reports/new');
  });
});
