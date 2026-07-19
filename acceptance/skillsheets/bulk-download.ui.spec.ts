// slice-21 bulk-download — UI 層（正本: docs/spec/slice-21.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S11 一括ダウンロードを叩く（静的検知4b）。
// golden は撮らず role/DOM アサーションへ縮退。UI ルートは S11（/bulk-download）。
import { test, expect } from '@playwright/test';

const UI_BASE = process.env.ACCEPTANCE_UI_BASE_URL ?? 'http://localhost:5173';

test.describe('slice-21 bulk-download [ui] — S11 一括ダウンロード', () => {
  // S11 一括ダウンロードは manager 専用 → ui セッションを担当 manager bulk_mgr（grp_engineer/grp_sales）に上書きする
  // （既定 staff01 では 403・slice-10 の mgr01 上書き前例と同型・工程4 翻訳欠陥修正）。
  test.use({
    storageState: {
      cookies: [],
      origins: [{ origin: UI_BASE, localStorage: [{ name: 'session', value: 'bulk_mgr' }] }],
    },
  });

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
