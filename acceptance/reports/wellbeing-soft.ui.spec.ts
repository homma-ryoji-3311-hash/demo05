// slice-20 wellbeing-soft-questions — UI 層（正本: docs/spec/slice-20.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。S3 業務報告入力の設問部にソフト設問（雑感/所感/課題/AI活用）を表示。
// 雑感は権限を持たない閲覧ビューに出さない・スコア/点数として提示する UI を持たない（DOM アサーション）。
import { test, expect } from '@playwright/test';

test.describe('slice-20 wellbeing-soft-questions [ui] — S3 ソフト設問', () => {
  // UI-AC: ソフト設問（雑感/所感/課題/AI活用）が報告入力の設問部に表示され回答できる
  test('ソフト設問が報告入力の設問部に表示される', async ({ page }) => {
    await page.goto('/reports/new');
    await expect(page.getByText(/雑感|所感|AI活用|AIを業務/).first()).toBeVisible();
  });

  // UI-AC: 雑感をスコア・点数として提示する UI が存在しない（監視ダッシュボードにしない）
  test('雑感をスコア・点数で提示する UI が存在しない', async ({ page }) => {
    await page.goto('/reports/new');
    await expect(page.getByText(/メンタルスコア|点数|ウェルビーイングスコア/)).toHaveCount(0);
  });
});
