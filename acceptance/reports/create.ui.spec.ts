// slice-01 report-draft — UI 層の受け入れテスト（正本: docs/spec/slice-01.md「画面要件」, approved）
// 起動先は ACCEPTANCE_UI_BASE_URL（frontend）。
//
// ADR-0018: 参照モックに画面は無いため、この ui.spec は工程4〜下流フェーズ完了まで「赤が正常」。
// 緑にできるのは frontend 実装後（工程6 /verify）。ここでは page.goto で画面を叩くこと（静的検知 4b）を満たし、
// UI 受入基準（S3 業務報告入力）を DOM アサーションで表現する。golden 撮影可否は撮影時に判断。
import { test, expect } from '@playwright/test';

test.describe('slice-01 report-draft [ui] — S3 業務報告入力', () => {
  // UI-AC 本文テキストエリアに入力すると下書きが自動保存され、保存状態がテキストで示される
  test('本文入力で下書きが自動保存され、保存状態がテキスト表示される', async ({ page }) => {
    await page.goto('/reports/new');
    const editor = page.getByRole('textbox', { name: /本文|報告/ });
    await expect(editor).toBeVisible();
    await editor.fill('本日はダッシュボードの改修を実施。');
    // 保存状態は色だけでなくテキストでも示す（非機能要件）
    await expect(page.getByText(/保存しました|下書きを保存|自動保存/)).toBeVisible();
  });

  // UI-AC 再訪時に保存済み下書きが復元表示される
  test('再訪時に保存済み下書きが復元される', async ({ page }) => {
    await page.goto('/reports/new');
    const editor = page.getByRole('textbox', { name: /本文|報告/ });
    await expect(editor).toHaveValue(/.+/);
  });
});
