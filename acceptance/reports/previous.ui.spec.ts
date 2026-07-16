// slice-05 previous-reference — UI 層（正本: docs/spec/slice-05.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S3 を叩く（静的検知4b）。
import { test, expect } from '@playwright/test';

test.describe('slice-05 previous-reference [ui] — S3 前回参照', () => {
  test('前回本文・前回要約が控えめな読み取り専用で表示される', async ({ page }) => {
    await page.goto('/reports/new');
    const prev = page.getByRole('region', { name: /前回/ });
    await expect(prev).toBeVisible();
    // 読み取り専用（入力欄ではない）
    await expect(prev.getByRole('textbox')).toHaveCount(0);
  });

  test('前回が無いときは「前回の報告はありません」が表示される', async ({ page }) => {
    await page.goto('/reports/new');
    await expect(page.getByText(/前回の報告はありません/)).toBeVisible();
  });
});
