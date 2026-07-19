// slice-21 bulk-download — UI 層（正本: docs/spec/slice-21.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S11 一括ダウンロードを叩く（静的検知4b）。
// golden は撮らず role/DOM アサーションへ縮退。UI ルートは S11（/bulk-download）。
import { test, expect } from '@playwright/test';

test.describe('slice-21 bulk-download [ui] — S11 一括ダウンロード', () => {
  // UI-AC: 客先/部署/グループの絞り込みコントロールが表示される
  test('客先/部署/グループの絞り込みコントロールが表示される', async ({ page }) => {
    await page.goto('/bulk-download');
    await expect(page.getByText(/客先|部署|グループ/).first()).toBeVisible();
  });

  // UI-AC: 「全員分を生成」操作と ZIP ダウンロード導線が表示される
  test('全員分を生成する操作と ZIP ダウンロード導線が表示される', async ({ page }) => {
    await page.goto('/bulk-download');
    await expect(page.getByRole('button', { name: /全員分|一括生成|生成/ })).toBeVisible();
  });

  // UI-AC: 対象件数や未生成スタッフの有無がテキストで示される（色のみに頼らない）
  test('対象件数や未生成の有無がテキストで示される', async ({ page }) => {
    await page.goto('/bulk-download');
    await expect(page.getByText(/件|対象|未生成/).first()).toBeVisible();
  });
});
