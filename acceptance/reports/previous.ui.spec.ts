// slice-05 previous-reference — UI 層（正本: docs/spec/slice-05.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため（reference-mock に対しては）赤が正常。page.goto で S3 を叩く（静的検知4b）。
//
// #21 の工程4 翻訳欠陥修正（2026-07-18）:
//   - test2 は staff01（seed に確定済み r_seed_confirmed を持つ）では「前回なし」の Given が成立せず、
//     正しい実装（前回を表示する）が赤になっていた。前回の無いユーザー（staff_fresh・API AC-2 と同じ）へ
//     storageState を上書きして Given を成立させる（auth.ui.spec の上書き前例）。
//   - test1 は「領域可視＋textbox不在」だけで、前回を一切表示しない/常に「ありません」を出すスタブでも緑だった（#15 型）。
//     PM決定 2026-07-18 Option B（構造アサート）: staff01 の確定済みは confirm.api.spec の並列書き込みで汚染され
//     seed 本文の固定は flaky。よって本文文字列そのものではなく、staff01（必ず前回あり）の領域に「ありません」が
//     出ない＝実内容が出ていることを固定し、test2（前回なし→ありません）と対で「前回の有無で出し分ける」ことを強制する。
import { test, expect } from '@playwright/test';

const UI_BASE = process.env.ACCEPTANCE_UI_BASE_URL ?? 'http://localhost:5173';

test.describe('slice-05 previous-reference [ui] — S3 前回参照', () => {
  test('前回本文・前回要約が控えめな読み取り専用で表示される（前回あり）', async ({ page }) => {
    await page.goto('/reports/new');
    const prev = page.getByRole('region', { name: /前回/ });
    await expect(prev).toBeVisible();
    // staff01 は seed で確定済み報告を持つ＝必ず前回がある。「ありません」ではなく実内容が出ている。
    await expect(prev.getByText(/前回の報告はありません/)).toHaveCount(0);
    // 読み取り専用（入力欄ではない）
    await expect(prev.getByRole('textbox')).toHaveCount(0);
  });

  test.describe('前回が無いユーザー', () => {
    // API 側 AC-2 と同じ「前回の無い」ユーザーへ storageState を上書きする。
    test.use({
      storageState: {
        cookies: [],
        origins: [{ origin: UI_BASE, localStorage: [{ name: 'session', value: 'staff_fresh' }] }],
      },
    });
    test('前回が無いときは「前回の報告はありません」が表示される', async ({ page }) => {
      await page.goto('/reports/new');
      const prev = page.getByRole('region', { name: /前回/ });
      await expect(prev).toBeVisible();
      await expect(prev.getByText(/前回の報告はありません/)).toBeVisible();
    });
  });
});
