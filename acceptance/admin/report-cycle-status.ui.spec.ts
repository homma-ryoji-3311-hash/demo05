// slice-15 report-cycle-status — UI 層（正本: docs/spec/slice-15.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で本人の報告履歴面を叩く（静的検知4b）。
// 仕様表: 専用の重い画面は新設せず、本人の報告履歴（/reports）に履行状況を read-only で載せる。
// 色のみに頼らずテキストで状態を示し、本人には計上・承認などの操作導線を出さない。golden 不可（DOM アサーションで代替）。
import { test, expect } from '@playwright/test';

test.describe('slice-15 report-cycle-status [ui] — 本人の履行状況（read-only）', () => {
  // UI-AC: 本人は自分の履行状況（5 ステータス）をテキストで一覧できる（色のみに頼らない）
  test('本人は自分の履行状況をテキストで閲覧できる', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByText(/提出済み|遅延提出|未報告|欠勤|報告漏れ/).first()).toBeVisible();
  });

  // UI-AC: 本人には計上・承認などの操作導線が出ない（read-only）
  test('本人には計上・承認などの操作導線が出ない（read-only）', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('button', { name: /報告漏れを計上|欠勤を承認|計上|承認/ })).toHaveCount(0);
  });
});
