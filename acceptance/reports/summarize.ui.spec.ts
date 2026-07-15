// slice-02 report-summarize — UI 層（正本: docs/spec/slice-02.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S4 を叩く（静的検知4b）。
import { test, expect } from '@playwright/test';

test.describe('slice-02 report-summarize [ui] — S4 AI要約 表示', () => {
  test('「要約する」で4カテゴリの結果が表示される', async ({ page }) => {
    await page.goto('/reports/new/review');
    await page.getByRole('button', { name: /要約/ }).click();
    for (const label of [/インシデント/, /成果/, /課題/, /スキル/]) {
      await expect(page.getByText(label)).toBeVisible();
    }
  });

  test('要約失敗時も入力本文が保持される（テキストで状態表示）', async ({ page }) => {
    await page.goto('/reports/new/review');
    await expect(page.getByText(/失敗|エラー|再試行/)).toBeVisible();
    await expect(page.getByRole('textbox')).toBeVisible();
  });
});
