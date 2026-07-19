// slice-17 staff-approval — UI 層（正本: docs/spec/slice-17.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S12 承認・担当紐付けを叩く（静的検知4b）。
// 参照モックに画面は無く answer key を持たないため golden は撮らず、role/DOM アサーションへ縮退する。
// UI ルートは API パスに合わせる（/admin/staff/pending）。承認待ち一覧の可視範囲＝super admin（PM 決定）。
import { test, expect } from '@playwright/test';

const UI_BASE = process.env.ACCEPTANCE_UI_BASE_URL ?? 'http://localhost:5173';

test.describe('slice-17 staff-approval [ui] — S12 承認待ち／承認・担当紐付け', () => {
  // S12 承認画面は super admin 専用 → ui セッションを super01 に上書きする（既定 staff01 では 403 でデータが出ない・
  // slice-10 の mgr01 上書き前例と同型・工程4 翻訳欠陥修正）。
  test.use({
    storageState: {
      cookies: [],
      origins: [{ origin: UI_BASE, localStorage: [{ name: 'session', value: 'super01' }] }],
    },
  });

  // UI-AC: 承認待ちスタッフ一覧が表示され、各行から承認へ進める
  test('承認待ちスタッフ一覧が表示され承認導線がある', async ({ page }) => {
    await page.goto('/admin/staff/pending');
    await expect(page.getByRole('list').or(page.getByRole('table'))).toBeVisible();
    await expect(page.getByRole('button', { name: /承認/ }).first()).toBeVisible();
  });

  // UI-AC: 承認・担当紐付けで 担当（主/副）・チャネル・報告サイクル を指定できる
  test('承認時に 担当（主/副）・チャネル・報告サイクル を指定できる', async ({ page }) => {
    await page.goto('/admin/staff/pending');
    await expect(page.getByText(/主担当|副担当|担当/).first()).toBeVisible();
    await expect(page.getByText(/チャネル/).first()).toBeVisible();
    await expect(page.getByText(/報告サイクル|サイクル|日報|週報/).first()).toBeVisible();
  });
});
