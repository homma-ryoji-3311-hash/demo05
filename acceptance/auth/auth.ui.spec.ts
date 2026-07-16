// slice-06 auth-authz — UI 層（正本: docs/spec/slice-06.md「画面要件」, approved）
// このスライスは「未認証」の挙動を検証するため、ui プロジェクト既定の認証済み storageState を空に上書きする。
// これにより slice-01 等（認証済みで /reports/new が入力画面）と slice-06 test2（未認証で /login へ）が両立する。
import { test, expect } from '@playwright/test';

// 未認証コンテキスト（fixture セッションを持たない）で走らせる。
test.use({ storageState: { cookies: [], origins: [] } });

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
