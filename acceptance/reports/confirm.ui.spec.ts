// slice-03 report-confirm — UI 層（正本: docs/spec/slice-03.md「画面要件」, approved）
//
// #19 の強化＋工程6 実機修正（2026-07-18）:
//   - test2 は要約せず「確定」を押し、AC-1 の Given（要約済み）を落として空要約の確定を実装に強制していた。
//     → 要約してから確定する。review は「保存済み本文」を要約するので、本文は autosave が効く入力ページで打つ。
//     同期は waitForResponse でなく DOM の「下書きを保存しました」表示待ち（レース無し）。
//   - test2 は共有 seed r_seed_draft を confirmed に消費し他スイートと競合していた → 専用ユーザーで自分の下書きを確定する。
import { test, expect } from '@playwright/test';

const UI_BASE = process.env.ACCEPTANCE_UI_BASE_URL ?? 'http://localhost:5173';

test.describe('slice-03 report-confirm [ui] — S4 AI要約 確認・編集', () => {
  test('全項目が編集可能で、要確認フラグがテキスト表示される', async ({ page }) => {
    await page.goto('/reports/new/review');
    await expect(page.getByRole('textbox').first()).toBeEditable();
    await expect(page.getByText(/要確認/)).toBeVisible();
  });

  test.describe('確定フロー（専用ユーザー・要約してから確定）', () => {
    // 共有 seed を消費しないよう専用ユーザーで走らせる（自分の下書きを確定する）。
    test.use({
      storageState: {
        cookies: [],
        origins: [{ origin: UI_BASE, localStorage: [{ name: 'session', value: 'confirm_ui_user' }] }],
      },
    });
    test('要約してから確定すると編集不可の確定表示へ切り替わる', async ({ page }) => {
      // review は既存下書きを要求する。専用ユーザーの下書きを入力ページ（autosave）で作る＝共有 seed を汚さない。
      await page.goto('/reports/new');
      await expect(page.getByText('自動保存が有効です')).toBeVisible(); // mount 完了（onChange 前の fill レースを避ける）
      await page.getByRole('textbox').first().fill('確定用の本文。テスト対応を実施した。');
      await expect(page.getByText('下書きを保存しました')).toBeVisible();
      // AC-1 の Given（要約済み）を満たす: 保存済み本文を要約してから確定（空要約の確定を強制しない）。
      await page.goto('/reports/new/review');
      await page.getByRole('button', { name: '要約する' }).click();
      await expect(page.locator('#summary-achievements')).toBeVisible(); // 要約済み（結果フォームが出た）

      await page.getByRole('button', { name: '確定' }).click();
      await expect(page.getByText(/確定済み/)).toBeVisible();
    });
  });
});
