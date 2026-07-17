// slice-02 report-summarize — UI 層（正本: docs/spec/slice-02.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため（reference-mock に対しては）赤が正常。page.goto で S4 を叩く（静的検知4b）。
//
// #15 の工程4 翻訳欠陥修正（2026-07-18・PM決定 Option B）: 旧テストは4カテゴリ「見出し」の可視だけを見ており、
//   現行 seed 本文「書きかけの下書き本文。」は全カテゴリ空になるため「結果」を一切表示しないスタブでも緑だった。
//   共有 seed を変えると create.ui 等と競合するため、テスト内でキーワードを含む本文を入力して実際の結果を出す。
import { test, expect } from '@playwright/test';

test.describe('slice-02 report-summarize [ui] — S4 AI要約 表示', () => {
  test('「要約する」で本文由来の結果（4カテゴリ）が表示される', async ({ page }) => {
    await page.goto('/reports/new/review');
    // 現行 seed は全カテゴリ空になるので、要約が結果を出す本文を入力する（PM決定 Option B）。
    const body = page.getByRole('textbox').first();
    await body.fill('ダッシュボードの改修を対応した。');
    // 要約は「保存済み本文」を対象にするため、自動保存（slice-01）の PATCH を待ってから要約する。
    const saved = page.waitForResponse(
      (r) => /\/reports\/[^/]+$/.test(new URL(r.url()).pathname) && r.request().method() === 'PATCH',
    );
    await body.blur();
    await saved;

    await page.getByRole('button', { name: /要約/ }).click();

    // 見出しだけでなく、本文由来の実内容が結果に現れることを固定する（空要約スタブを落とす）。
    await expect(page.getByText('ダッシュボードの改修を対応した')).toBeVisible();
    for (const label of [/インシデント/, /成果/, /課題/, /スキル/]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  // 失敗は page.route で 502 を注入して「起こす」。UI 層の関心は失敗の見せ方であり、
  // 実 HTTP での 502・下書き保持は summarize.api.spec の AC-4 が担保している。
  // 共有フィクスチャ（staff01 の下書きは1本）を書き換えないので、並列実行でも他スイートと競合しない。
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

    await page.getByRole('button', { name: /要約/ }).click();

    await expect(page.getByText(/失敗|エラー|再試行/)).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveValue(/.+/); // 失敗しても本文は画面から消えない
  });
});
