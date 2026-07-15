// slice-06 auth-authz — UI 層（正本: docs/spec/slice-06.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S1 を叩く（静的検知4b）。
import { test, expect } from '@playwright/test';

test.describe('slice-06 auth-authz [ui] — S1 ログイン', () => {
  test('ログインボタンからロール別ホームへ遷移する', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /ログイン|Google/ })).toBeVisible();
  });

  test('未ログインでは保護画面に入れずログインへ誘導される', async ({ page }) => {
    await page.goto('/reports/new');
    await expect(page).toHaveURL(/\/login/);
  });
});
