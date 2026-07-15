// slice-03 report-confirm — UI 層（正本: docs/spec/slice-03.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S4 を叩く（静的検知4b）。
import { test, expect } from '@playwright/test';

test.describe('slice-03 report-confirm [ui] — S4 AI要約 確認・編集', () => {
  test('全項目が編集可能で、要確認フラグがテキスト表示される', async ({ page }) => {
    await page.goto('/reports/new/review');
    await expect(page.getByRole('textbox').first()).toBeEditable();
    await expect(page.getByText(/要確認/)).toBeVisible();
  });

  test('確定後は編集不可の確定表示へ切り替わる', async ({ page }) => {
    await page.goto('/reports/new/review');
    await page.getByRole('button', { name: /確定/ }).click();
    await expect(page.getByText(/確定済み/)).toBeVisible();
  });
});
