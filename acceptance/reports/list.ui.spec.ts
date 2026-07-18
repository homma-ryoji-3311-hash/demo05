// slice-04 report-list — UI 層（正本: docs/spec/slice-04.md「画面要件」, approved）
// ADR-0018: frontend 未実装のため（reference-mock に対しては）赤が正常。page.goto で S5 を叩く（静的検知4b）。
//
// #20 の工程4 翻訳欠陥修正（2026-07-18）: 旧テストは strict mode と UI-AC の内容が矛盾し、正しい実装が赤だった。
//   - 一覧は複数行あるので `getByText(/下書き|確定/)` は必ず複数一致 → strict violation。
//     状況は「行（link）」に閉じ、seed 由来の確定行・下書き行がそれぞれ在ることを固定する（複数行前提・.first()）。
//   - 詳細の `getByText(/本文|要約/)` は seed 本文「書きかけの下書き本文。」が「本文」を含むため見出しと二重一致。
//     見出し(role=heading)で一意指定して語衝突を断つ。かつ確定要約を見るには確定行を開く（下書きは確定要約が無い）。
import { test, expect } from '@playwright/test';

test.describe('slice-04 report-list [ui] — S5 業務報告一覧・詳細', () => {
  test('一覧に日付・状況（下書き/確定）がテキスト表示される', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.getByRole('list')).toBeVisible();
    // 一覧は複数行＝状況テキストは複数一致する。行(link)に閉じて strict 衝突を避け、両状況の存在を固定。
    await expect(page.getByRole('link', { name: /確定/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /下書き/ }).first()).toBeVisible();
  });

  test('確定行を開くと本文と確定要約の詳細が表示される', async ({ page }) => {
    await page.goto('/reports');
    // 確定要約は確定済み報告にしか無いので、下書きではなく確定行を開く。
    await page.getByRole('link', { name: /確定/ }).first().click();
    // フィクスチャ本文が「本文」を含むため getByText は衝突する。見出し(role=heading)で一意指定する。
    await expect(page.getByRole('heading', { name: /本文/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /確定要約|要約/ })).toBeVisible();
  });
});
