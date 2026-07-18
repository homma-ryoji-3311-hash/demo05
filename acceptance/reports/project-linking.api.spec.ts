// slice-11 project-linking — API 層（正本: docs/spec/slice-11.md, approved 2026-07-19）
// 確定 POST /reports/:id/confirm を拡張し、対応案件を案件キーで既存/新規に紐づけ、INCIDENTS 状態を保存する。
// HTTP 契約は grill で pin（source: PM・spec 表「HTTP 契約」節）。画面なし → ui.spec は免除（ADR-0018）。
// seed: staff01 の既存案件 p_seed（project_key=PJ-SEED-001）。突合=slice-12 は後続。
import { test, expect } from '@playwright/test';

type Req = import('@playwright/test').APIRequestContext;

/**
 * 下書きを1件作り要約まで進める（確定は summary 省略で ai_summary_json フォールバック・slice-03/#45）。
 * summarize を通すことで backend でも「summary 欠如の 422」に落ちず、赤/緑の差が **案件紐づけの有無だけ**になる
 * （backend は projects/incidents を返さない＝赤・オラクルは返す＝緑）。
 */
async function draft(request: Req, rawText = '案件対応の報告。'): Promise<string> {
  const res = await request.post('/reports', { data: { raw_text: rawText, report_date: '2026-07-15' } });
  const id = (await res.json()).id as string;
  await request.post(`/reports/${id}/summarize`);
  return id;
}

test.describe('slice-11 project-linking [api]', () => {
  // AC-1 既存案件へ案件キーで紐づく（重複作成しない・既存 id へ）
  test('AC-1 既存案件（PJ-SEED-001）へ案件キーで紐づく（200・既存 id）', async ({ request }) => {
    const id = await draft(request);
    const res = await request.post(`/reports/${id}/confirm`, {
      data: { projects: [{ project_key: 'PJ-SEED-001', contribution: '認証基盤の改修を担当' }] },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('confirmed');
    expect(Array.isArray(body.projects)).toBe(true);
    expect(body.projects[0].project_key).toBe('PJ-SEED-001');
    expect(body.projects[0].id).toBe('p_seed'); // 既存案件へ紐づく＝新規作成しない
  });

  // AC-2 INCIDENTS は「発生／対応中／解決」の status を持ち、案件（project_id）に紐づく
  test('AC-2 インシデント status が案件に紐づいて保存される（200）', async ({ request }) => {
    const id = await draft(request);
    const key = `PJ-INC-${id}`; // このテスト固有の案件キー（並列干渉を避ける）
    const res = await request.post(`/reports/${id}/confirm`, {
      data: { projects: [{ project_key: key, contribution: 'x', incidents: [{ status: '対応中' }] }] },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.incidents.length).toBeGreaterThan(0);
    expect(['発生', '対応中', '解決']).toContain(body.incidents[0].status);
    expect(body.incidents[0].status).toBe('対応中');
    expect(body.incidents[0].project_id).toBe(body.projects[0].id); // 案件へ紐づく
  });

  // AC-3 未知の案件キーは新規案件として作成し、同一キーの2回目は既存へ紐づく（重複作成しない）
  test('AC-3 未知キーは新規案件・同一キー再確定は既存 id（200）', async ({ request }) => {
    const idA = await draft(request);
    const key = `PJ-NEW-${idA}`; // 未知キー（このユーザーに存在しない）
    const a = await (
      await request.post(`/reports/${idA}/confirm`, { data: { projects: [{ project_key: key, contribution: 'A' }] } })
    ).json();
    const newId = a.projects[0].id as string;
    expect(newId).toBeTruthy();
    expect(newId).not.toBe('p_seed'); // seed ではない＝新規作成された

    const idB = await draft(request);
    const b = await (
      await request.post(`/reports/${idB}/confirm`, { data: { projects: [{ project_key: key, contribution: 'B' }] } })
    ).json();
    expect(b.projects[0].id).toBe(newId); // 同一キーの2回目は既存へ（重複作成しない）
  });

  // AC-4 不正なインシデントステータスは 422・部分適用を残さない（原子性）
  test('AC-4 不正な incident status は 422（紐づけ・案件作成・保存を残さない）', async ({ request }) => {
    const id = await draft(request);
    const key = `PJ-BAD-${id}`;
    const res = await request.post(`/reports/${id}/confirm`, {
      data: { projects: [{ project_key: key, contribution: 'x', incidents: [{ status: '未定義値' }] }] },
    });
    expect(res.status()).toBe(422);
    // 原子性: 422 の後もその報告は確定されていない（部分適用なし）
    const after = await (await request.get(`/reports/${id}`)).json();
    expect(after.status).toBe('draft');
  });
});
