// slice-09 skillsheet-view — UI 層（正本: docs/spec/slice-09.md「画面要件」, approved 2026-07-18）
// ADR-0018: frontend 未実装のため（工程4 時点では）赤が正常。page.goto で S6 を叩く（静的検知4b）。
// UI-AC は source: PM（参照モックに画面 DOM が無い＝本当の設計）。ui セッションは staff01（seed に生成済み2版）。
// 内容の正しさは工程6 /verify の反転確認（frontend 停止）で担保する。ここは存在＋画面を叩くことまで。
import { test, expect } from '@playwright/test';

test.describe('slice-09 skillsheet-view [ui] — S6 スキルシート閲覧', () => {
  // AC-1 生成済みシートが生成日時の新しい順で一覧表示され、各版（生成日時）が識別できる
  test('生成済みシートが生成日時つきで新しい順に一覧表示される', async ({ page }) => {
    await page.goto('/skill-sheets');
    const list = page.getByRole('list', { name: /スキルシート|一覧|履歴/ });
    await expect(list).toBeVisible();
    // 複数版（履歴）が行として並ぶ
    await expect(list.getByRole('listitem').first()).toBeVisible();
    // 各行に生成日時（版の識別）が見える（seed: 2026-07-1x）
    await expect(list).toContainText(/2026/);
  });

  // AC-2 各行に xlsx ダウンロードの導線がある（元の xlsx を取得）
  test('各シート行に xlsx ダウンロードの導線がある', async ({ page }) => {
    await page.goto('/skill-sheets');
    await expect(page.getByRole('link', { name: /ダウンロード/ }).first()).toBeVisible();
  });

  // AC-5 プレビュー導線を操作すると、そのシートの内容が HTML プレビューとして画面に表示される
  test('プレビュー導線で HTML プレビューが画面に表示される', async ({ page }) => {
    await page.goto('/skill-sheets');
    await page
      .getByRole('button', { name: /プレビュー/ })
      .first()
      .click();
    const preview = page.getByRole('region', { name: /プレビュー/ });
    await expect(preview).toBeVisible();
    // HTML プレビューの内容（職務経歴/スキル）が表示される（PDF/画像でない）
    await expect(preview).toContainText(/職務経歴|スキル/);
  });
});
