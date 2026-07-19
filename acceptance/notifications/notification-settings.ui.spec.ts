// slice-13 notification-settings — UI 層（正本: docs/spec/slice-13.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S9 通知設定を叩く（静的検知4b）。
// 参照モックに画面は無く answer key を持たないため golden は撮らず、role/label ベースの DOM アサーションへ縮退する。
// UI ルートは API パスに合わせる（既存規約: /skill-sheets・/templates と同様に /notification-settings）。
import { test, expect } from '@playwright/test';

test.describe('slice-13 notification-settings [ui] — S9 通知設定', () => {
  // UI-AC: リマインド時刻を入力・変更できるフォームが表示される
  test('リマインド時刻を入力できるフォームが表示される', async ({ page }) => {
    await page.goto('/notification-settings');
    await expect(page.getByLabel(/リマインド|通知時刻|時刻/)).toBeVisible();
  });

  // UI-AC: Slack 通知・メール通知の ON/OFF をそれぞれ切り替えられる
  test('Slack 通知とメール通知の ON/OFF をそれぞれ切り替えられる', async ({ page }) => {
    await page.goto('/notification-settings');
    await expect(
      page.getByRole('switch', { name: /Slack/ }).or(page.getByRole('checkbox', { name: /Slack/ })),
    ).toBeVisible();
    await expect(
      page.getByRole('switch', { name: /メール/ }).or(page.getByRole('checkbox', { name: /メール/ })),
    ).toBeVisible();
  });

  // UI-AC: 現在のタイムゾーンがローカル時刻としてテキスト表示される（どの TZ で解釈されるか分かる）
  test('現在のタイムゾーンがテキスト表示される', async ({ page }) => {
    await page.goto('/notification-settings');
    await expect(page.getByText(/Asia\/Tokyo|タイムゾーン|時間帯/)).toBeVisible();
  });
});
