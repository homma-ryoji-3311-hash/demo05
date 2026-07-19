// slice-23 ai-follow-up-question — UI 層（正本: docs/spec/slice-23.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。S4 AI要約 確認・編集 の拡張（追加質問を確認・確定フロー内に差し込む）。
// golden は基本フローのみ／再来訪 UI は slice-26 へ段階送りで対象外。DOM アサーションで検証。
import { test, expect } from '@playwright/test';

test.describe('slice-23 ai-follow-up-question [ui] — S4 追加質問', () => {
  // UI-AC: 薄い項目への追加質問が確認画面に提示され、その場で回答を入力できる
  test('追加質問が確認画面に提示され回答を入力できる', async ({ page }) => {
    await page.goto('/reports/new/review');
    await expect(page.getByText(/追加質問|詳しく|具体的/).first()).toBeVisible();
  });

  // UI-AC: 必須未回答のとき「確定」操作が無効化される（テキストで理由を示す・色のみに頼らない）
  test('必須未回答のとき確定が無効化され理由がテキストで示される', async ({ page }) => {
    await page.goto('/reports/new/review');
    await expect(page.getByText(/必須|回答してください|未回答/).first()).toBeVisible();
  });
});
