// slice-14 admin-console — UI 層（正本: docs/spec/slice-14.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S8 管理者コンソールを叩く（静的検知4b）。
// 参照モックに画面は無く answer key を持たないため golden は撮らず、role/DOM アサーションへ縮退する。
// UI ルートは API パスに合わせる（既存規約: /skill-sheets・/templates と同様に /admin/staff）。
import { test, expect } from '@playwright/test';

test.describe('slice-14 admin-console [ui] — S8 管理者コンソール/スタッフ一覧', () => {
  // UI-AC: 担当グループがタブとして並ぶ
  test('担当グループがタブとして表示される', async ({ page }) => {
    await page.goto('/admin/staff');
    await expect(page.getByRole('tab').first()).toBeVisible();
  });

  // UI-AC: スタッフが表形式で 氏名・客先・報告状況 等の列とともに表示される
  test('スタッフが表形式で 氏名・客先・報告状況 の列つきで表示される', async ({ page }) => {
    await page.goto('/admin/staff');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /氏名|名前/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /客先|クライアント/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /報告状況|状況/ })).toBeVisible();
  });

  // UI-AC: 報告状況が「報告済み／未報告」のテキストで表示される
  test('報告状況が 報告済み／未報告 のテキストで表示される', async ({ page }) => {
    await page.goto('/admin/staff');
    await expect(page.getByText(/報告済み|未報告/).first()).toBeVisible();
  });
});
