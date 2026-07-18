// slice-08 skillsheet-generate — API 層（正本: docs/spec/slice-08.md, approved 2026-07-18）
// 画面なし（仕様表「画面要件」に理由つきで明記）→ ui.spec は免除。完了判定は本 API 受け入れテスト（ADR-0018）。
// 生成入力は seed された合成マスター元データ（消費者 seam・突合=slice-11/12 は後続）。
import { test, expect } from '@playwright/test';

const flat = (c: any): string[] => [...(c.career_summary ?? []), ...(c.skills ?? []), ...(c.issues ?? [])];

test.describe('slice-08 skillsheet-generate [api]', () => {
  // AC-1 3フェーズ分離（データ組立→AI言い換え→テンプレート反映）。AI言い換えの構造化結果がレスポンスに含まれる。
  test('AC-1 POST /skill-sheets は 201 と AI言い換えの構造化内容を返す', async ({ request }) => {
    const res = await request.post('/skill-sheets', { data: {} });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.content).toBeTruthy();
    expect(Array.isArray(body.content.career_summary)).toBe(true);
    expect(Array.isArray(body.content.skills)).toBe(true);
    // データ組立→AI言い換えが実際に働いた（空でない・空スキルシートを返すスタブを落とす）
    expect(flat(body.content).length).toBeGreaterThan(0);
  });

  // AC-2 マスターに無い数値を AI が創作しない（数字なしマスター → 内容にも数字なし・中身は空でない）
  test('AC-2 生成内容に数値が創作されない（中身は空でない）', async ({ request }) => {
    const body = await (await request.post('/skill-sheets', { data: {} })).json();
    const all = flat(body.content);
    expect(all.length).toBeGreaterThan(0); // 空振り防止ガード（slice-02 AC-3 同型）
    for (const s of all) expect(/\d/.test(s)).toBe(false);
  });

  // AC-3 出力ファイル名をサーバ側で機械的に付与（[スタッフ名]_[ファイル名]_YYYYMMDD.xlsx・パターンで固定）
  test('AC-3 ファイル名は [スタッフ名]_..._YYYYMMDD.xlsx の形式', async ({ request }) => {
    const body = await (await request.post('/skill-sheets', { data: {} })).json();
    expect(body.filename).toMatch(/^.+_.+_\d{8}\.xlsx$/); // 日付の実値には依存しない
  });

  // AC-4 合成の署名付き URL＋再生成は新 id/file_url の非破壊作成（旧を上書きしない）
  test('AC-4 再生成は新 id/file_url（別オブジェクト）で署名付きURLを含む', async ({ request }) => {
    const a = await (await request.post('/skill-sheets', { data: {} })).json();
    const b = await (await request.post('/skill-sheets', { data: {} })).json();
    expect(a.file_url).toMatch(/^https?:\/\/.+/); // 合成の署名付き URL（非空）
    expect(a.id).not.toBe(b.id); // 再生成は別の id（新規作成）
    expect(a.file_url).not.toBe(b.file_url); // 別ストレージオブジェクト（一意性は URL/id 側）
  });

  // AC-5 認可: 他人の staff_id を対象にした要求は 403
  test('AC-5 他人の staff_id を対象にした生成は 403', async ({ request }) => {
    const res = await request.post('/skill-sheets', { data: { staff_id: 'staff02' } });
    expect(res.status()).toBe(403);
  });

  // AC-5 認可: 未認証は 401
  test('AC-5 未認証の生成は 401', async ({ request }) => {
    const res = await request.post('/skill-sheets', { data: {}, headers: { 'X-User-Id': '' } });
    expect(res.status()).toBe(401);
  });
});
