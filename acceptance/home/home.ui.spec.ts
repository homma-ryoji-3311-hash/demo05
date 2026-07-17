// slice-07 staff-home — UI 層（正本: docs/spec/slice-07.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S2 を叩く（静的検知4b）。
//
// #26 D-1 の翻訳欠陥修正（2026-07-18）:
//   旧テストは状態テキストを `getByText(/未報告|下書き|確定済み/)` で緩く拾い、下書き「導線リンク」の語
//   「下書き」とも二重一致して strict mode violation になり、正しい実装が赤だった。かつ3択 alternation は
//   どの状態でも通るので実質未検証。状態テキストは role="status" に閉じ込めて語の衝突を断ち、
//   期待値を seed 由来（UI セッション staff01 は backend seed で下書き r_seed_draft を持つ＝下書きあり）に固定する。
import { test, expect } from '@playwright/test';

test.describe('slice-07 staff-home [ui] — S2 スタッフ用ホーム', () => {
  test('今日の報告状況がテキストで表示される（seed: 下書きあり）', async ({ page }) => {
    await page.goto('/home');
    // 状態テキストは status ロールに閉じる（導線リンクの「下書き」と衝突させない）。
    const status = page.getByRole('status');
    await expect(status).toBeVisible();
    await expect(status).toContainText(/下書き/); // staff01 は下書きあり（3択のどれでも通る書き方をしない）
  });

  test('下書きへの導線と報告入力への導線が表示される', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('link', { name: /下書き/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /報告入力|新規報告/ })).toBeVisible();
  });
});
