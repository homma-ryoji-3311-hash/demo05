// slice-02 report-summarize — UI 層（正本: docs/spec/slice-02.md「画面要件」, approved）
//
// #15 の強化＋工程6 実機修正（2026-07-18）: review ページ（S4）は「保存済み本文」を要約し、blur では autosave しない。
//   よって実内容を出すには、autosave が効く入力ページ（/reports/new）で本文を打ってから review で要約する。
//   同期は waitForResponse ではなく DOM の「下書きを保存しました」表示待ち（レース無し）。専用ユーザーで共有 seed を汚さない。
import { test, expect } from '@playwright/test';

const UI_BASE = process.env.ACCEPTANCE_UI_BASE_URL ?? 'http://localhost:5173';

test.describe('slice-02 report-summarize [ui] — S4 AI要約 表示', () => {
  test.describe('本文入力→要約（専用ユーザー）', () => {
    test.use({
      storageState: {
        cookies: [],
        origins: [{ origin: UI_BASE, localStorage: [{ name: 'session', value: 'summarize_ui_user' }] }],
      },
    });
    test('「要約する」で本文由来の結果が表示される', async ({ page }) => {
      // 入力ページで本文を打ち、自動保存の完了を DOM で待つ（review は保存済み本文を要約する）。
      await page.goto('/reports/new');
      await expect(page.getByText('自動保存が有効です')).toBeVisible(); // mount 完了（onChange 前の fill レースを避ける）
      await page.getByRole('textbox').first().fill('ダッシュボードの改修を対応した。');
      await expect(page.getByText('下書きを保存しました')).toBeVisible();
      // 保存済み本文を要約する
      await page.goto('/reports/new/review');
      await page.getByRole('button', { name: '要約する' }).click();
      // 見出しだけでなく、本文由来の実内容が結果（成果欄の value）に現れる＝空要約を返す実装を落とす。
      await expect(page.locator('#summary-achievements')).toHaveValue(/ダッシュボードの改修を対応した/);
    });
  });

  // 失敗は page.route で 502 を注入して「起こす」。UI 層の関心は失敗の見せ方であり、
  // 実 HTTP での 502・下書き保持は summarize.api.spec の AC-4 が担保している。
  // staff01 の下書きは書き換えない（要約は ai_summary_json を変えるだけで下書きを消費しない）。
  test('要約失敗時も入力本文が保持される（テキストで状態表示）', async ({ page }) => {
    await page.route('**/reports/*/summarize', (route) =>
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'summarization failed' }),
      }),
    );

    await page.goto('/reports/new/review');
    await expect(page.getByRole('textbox')).toHaveValue(/.+/);

    await page.getByRole('button', { name: '要約する' }).click();

    await expect(page.getByText(/失敗|エラー|再試行/)).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveValue(/.+/); // 失敗しても本文は画面から消えない
  });
});
