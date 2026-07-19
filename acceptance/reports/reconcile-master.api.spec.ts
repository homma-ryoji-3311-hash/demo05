// slice-12 reconcile-master — API 層（正本: docs/spec/slice-12.md, approved 2026-07-19）
// 突合は確定 POST /reports/:id/confirm の同一処理内で同期実行し（AC-5）、確定レスポンスに master_summaries を返す（ADR-0019）。
// (user_id, project_id, period) で upsert・incident は key で最新上書き・生報告ログ不変。画面なし → ui.spec 免除（ADR-0018）。
import { test, expect } from '@playwright/test';

type Req = import('@playwright/test').APIRequestContext;
type Incident = { key: string; status: string };
type MasterSummary = {
  user_id: string;
  project_id: string;
  period: string;
  summary: { incidents: Incident[] };
  reconciled_at: string;
};

/** 下書きを作り要約まで進める（period 制御のため report_date を指定）。 */
async function draft(request: Req, reportDate: string, rawText = '案件対応の報告。'): Promise<string> {
  const res = await request.post('/reports', { data: { raw_text: rawText, report_date: reportDate } });
  const id = (await res.json()).id as string;
  await request.post(`/reports/${id}/summarize`);
  return id;
}

test.describe('slice-12 reconcile-master [api]', () => {
  // AC-1 増分突合: 既存マスターに新報告のみをマージ（全再処理でなく既存 incident を保持）
  test('AC-1 増分: 同一案件×期間の2報告で既存 incident が保持され新報告がマージされる', async ({ request }) => {
    const idA = await draft(request, '2026-07-10');
    const pkey = `PJ-A1-${idA}`;
    const a = await (
      await request.post(`/reports/${idA}/confirm`, {
        data: { projects: [{ project_key: pkey, incidents: [{ key: 'INC-1', status: '対応中' }] }] },
      })
    ).json();
    expect(a.master_summaries[0].period).toBe('2026-07');
    const projId = a.master_summaries[0].project_id as string;

    const idB = await draft(request, '2026-07-20'); // 同月＝同 period
    const b = await (
      await request.post(`/reports/${idB}/confirm`, {
        data: { projects: [{ project_key: pkey, incidents: [{ key: 'INC-2', status: '発生' }] }] },
      })
    ).json();
    const ms = (b.master_summaries as MasterSummary[]).find((m) => m.project_id === projId)!;
    const keys = ms.summary.incidents.map((i) => i.key);
    expect(keys).toContain('INC-1'); // 既存が保持（＝全履歴再処理でなく増分）
    expect(keys).toContain('INC-2'); // 新報告がマージされた
  });

  // AC-2 同一案件キー・同一 incident key はステータスを最新で上書き（追記でない）
  test('AC-2 同一 incident key は最新 status で上書き（1件のまま）', async ({ request }) => {
    const idA = await draft(request, '2026-07-10');
    const pkey = `PJ-A2-${idA}`;
    await request.post(`/reports/${idA}/confirm`, {
      data: { projects: [{ project_key: pkey, incidents: [{ key: 'INC-1', status: '対応中' }] }] },
    });
    const idB = await draft(request, '2026-07-11');
    const b = await (
      await request.post(`/reports/${idB}/confirm`, {
        data: { projects: [{ project_key: pkey, incidents: [{ key: 'INC-1', status: '解決' }] }] },
      })
    ).json();
    const inc1 = (b.master_summaries[0].summary.incidents as Incident[]).filter((i) => i.key === 'INC-1');
    expect(inc1.length).toBe(1); // 追記して2件にならない
    expect(inc1[0].status).toBe('解決'); // 最新で上書き
  });

  // AC-3 生報告ログは不変。更新は master_summaries 側のみ（report には載らない）
  test('AC-3 生報告ログ不変・更新はマスター側のみ', async ({ request }) => {
    const id = await draft(request, '2026-07-10', '元の本文です。');
    await request.post(`/reports/${id}/confirm`, {
      data: {
        summary: { incidents: [], achievements: [], issues: [], skills: [] },
        projects: [{ project_key: `PJ-A3-${id}`, incidents: [{ key: 'INC-1', status: '解決' }] }],
      },
    });
    const rep = await (await request.get(`/reports/${id}`)).json();
    expect(rep.raw_text).toBe('元の本文です。'); // REPORTS 不変
    expect(rep.master_summaries).toBeUndefined(); // マスターは report に載らない（別レイヤー）
  });

  // AC-4 (user_id, project_id, period) で冪等 upsert（重複行を作らず内容不変）
  test('AC-4 同一案件×期間の同一内容は冪等（1行・summary 不変）', async ({ request }) => {
    const idA = await draft(request, '2026-07-10');
    const pkey = `PJ-A4-${idA}`;
    const a = await (
      await request.post(`/reports/${idA}/confirm`, {
        data: { projects: [{ project_key: pkey, incidents: [{ key: 'INC-1', status: '解決' }] }] },
      })
    ).json();
    const rowA = a.master_summaries[0] as MasterSummary;

    const idB = await draft(request, '2026-07-15'); // 同月
    const b = await (
      await request.post(`/reports/${idB}/confirm`, {
        data: { projects: [{ project_key: pkey, incidents: [{ key: 'INC-1', status: '解決' }] }] },
      })
    ).json();
    const rowsForKey = (b.master_summaries as MasterSummary[]).filter(
      (m) => m.project_id === rowA.project_id && m.period === rowA.period,
    );
    expect(rowsForKey.length).toBe(1); // 重複行を作らない
    expect(rowsForKey[0].summary.incidents).toEqual(rowA.summary.incidents); // reconciled_at 以外は不変（冪等）
  });

  // AC-5 突合は確定と同一レスポンス内で走る（別ジョブ・夜間バッチを待たない）
  test('AC-5 確定レスポンスに突合結果 master_summaries が含まれる（同期）', async ({ request }) => {
    const id = await draft(request, '2026-07-10');
    const r = await (
      await request.post(`/reports/${id}/confirm`, {
        data: { projects: [{ project_key: `PJ-A5-${id}`, incidents: [{ key: 'INC-1', status: '発生' }] }] },
      })
    ).json();
    expect(Array.isArray(r.master_summaries)).toBe(true);
    expect(r.master_summaries.length).toBeGreaterThan(0);
    expect(r.master_summaries[0].reconciled_at).toBeTruthy();
  });
});
