// slice-04 report-list — UI 層（正本: docs/spec/slice-04.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S5 を叩く（静的検知4b）。
import { test, expect } from '@playwright/test';

test.describe('slice-04 report-list [ui] — S5 業務報告一覧・詳細', () => {
  test('一覧に日付・状況（下書き/確定）がテキスト表示される', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('list')).toBeVisible();
    await expect(page.getByText(/下書き|確定/)).toBeVisible();
  });

  test('行を開くと本文と確定要約の詳細が表示される', async ({ page }) => {
    await page.goto('/reports');
    await page.getByRole('link').first().click();
    await expect(page.getByText(/本文|要約/)).toBeVisible();
  });
});
