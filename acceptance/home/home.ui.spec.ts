// slice-07 staff-home — UI 層（正本: docs/spec/slice-07.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S2 を叩く（静的検知4b）。
import { test, expect } from '@playwright/test';

test.describe('slice-07 staff-home [ui] — S2 スタッフ用ホーム', () => {
  test('今日の報告状況がテキストで表示される', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByText(/未報告|下書き|確定済み/)).toBeVisible();
  });

  test('下書きへの導線と報告入力への導線が表示される', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('link', { name: /下書き/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /報告入力|新規報告/ })).toBeVisible();
  });
});
