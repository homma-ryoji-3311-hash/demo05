// slice-10 excel-template-manage — UI 層（正本: docs/spec/slice-10.md「画面要件」, approved 2026-07-18）
// ADR-0018: frontend 未実装のため（工程4 時点では）赤が正常。page.goto で S7 を叩く（静的検知4b）。
// S7 は manager 画面 → ui セッションを mgr01 に上書きする（auth.ui / previous.ui の上書き前例）。
// UI-AC は source: PM。内容の正しさは工程6 /verify の反転確認（frontend 停止）で担保する。
import { test, expect } from '@playwright/test';

const UI_BASE = process.env.ACCEPTANCE_UI_BASE_URL ?? 'http://localhost:5173';

test.describe('slice-10 excel-template-manage [ui] — S7 テンプレート管理', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [{ origin: UI_BASE, localStorage: [{ name: 'session', value: 'mgr01' }] }],
    },
  });

  // UI-AC: テンプレートのアップロードフォームがある＋アンカー検証結果の表示領域
  test('テンプレートのアップロードフォームと検証結果の表示領域がある', async ({ page }) => {
    await page.goto('/templates');
    // アップロードのファイル入力（Excel テンプレート）
    await expect(page.getByLabel(/テンプレート|アップロード|ファイル/)).toBeVisible();
    // アンカー検証結果（成功／欠落警告）のテキスト表示領域
    await expect(page.getByRole('status')).toBeVisible();
  });

  // UI-AC: 版の一覧（履歴）が表示され、有効版が明示され、切替操作がある
  test('版の一覧（履歴）と有効版の明示・切替操作がある', async ({ page }) => {
    await page.goto('/templates');
    const list = page.getByRole('list', { name: /テンプレート|版|履歴/ });
    await expect(list).toBeVisible();
    await expect(list.getByRole('listitem').first()).toBeVisible(); // 複数版（履歴）
    await expect(list.getByText(/有効/)).toBeVisible(); // どれが有効版か明示
    await expect(page.getByRole('button', { name: /有効化|有効にする|切り替え/ }).first()).toBeVisible(); // 切替操作
  });
});
