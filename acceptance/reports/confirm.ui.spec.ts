// slice-03 report-confirm — UI 層（正本: docs/spec/slice-03.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため（reference-mock に対しては）赤が正常。page.goto で S4 を叩く（静的検知4b）。
//
// #19 の工程4 翻訳欠陥修正（2026-07-18）:
//   - test2 は要約せずに「確定」を押しており、AC-1 の Given（要約済み）を落として空要約の確定を実装に強制していた
//     （誤クリック1回で空要約が回復不能に確定）。→ 本文入力→自動保存→要約（結果が出る）→確定 の順にする。
//   - test2 は共有 seed r_seed_draft（staff01 の唯一の下書き）を confirmed に消費し、create.ui/summarize.ui と競合していた。
//     → 専用ユーザーへ storageState を上書きし、その人自身の下書きを確定する（共有 seed を汚さない・previous.ui と同型）。
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
      await page.goto('/reports/new/review');
      // AC-1 の Given（要約済み）を満たす: 本文入力→自動保存→要約。空要約の確定を強制しない。
      const body = page.getByRole('textbox').first();
      await body.fill('ダッシュボードの改修を対応した。');
      const saved = page.waitForResponse(
        (r) => /\/reports\/[^/]+$/.test(new URL(r.url()).pathname) && r.request().method() === 'PATCH',
      );
      await body.blur();
      await saved;
      await page.getByRole('button', { name: /要約/ }).click();
      // 要約結果（本文由来の実内容）が出たのを待ってから確定する。
      await expect(page.getByText('ダッシュボードの改修を対応した')).toBeVisible();

      await page.getByRole('button', { name: /確定/ }).click();
      await expect(page.getByText(/確定済み/)).toBeVisible();
    });
  });
});
