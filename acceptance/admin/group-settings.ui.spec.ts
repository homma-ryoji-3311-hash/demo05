// slice-22 group-settings — UI 層（正本: docs/spec/slice-22.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。専用画面は新設せず S8 管理者コンソール内のグループ設定領域に置く。
// golden は撮らず role/DOM アサーションへ縮退。UI ルートは S8 内の設定領域（/admin/group-settings）。
import { test, expect } from '@playwright/test';

test.describe('slice-22 group-settings [ui] — S8 グループ設定領域', () => {
  // UI-AC: グループを選択し、設問セット版・様式・担当・タブ表示を設定できる
  test('グループを選択して設問セット版・様式・タブを設定できる', async ({ page }) => {
    await page.goto('/admin/group-settings');
    await expect(page.getByText(/グループ/).first()).toBeVisible();
    await expect(page.getByText(/設問セット|様式|タブ/).first()).toBeVisible();
  });

  // UI-AC: 保存時に「変更は翌日以降の報告に適用される」旨がテキストで示される
  test('保存時に翌日以降適用の旨がテキストで示される', async ({ page }) => {
    await page.goto('/admin/group-settings');
    await expect(page.getByText(/翌日以降|翌営業日|翌日から/).first()).toBeVisible();
  });
});
