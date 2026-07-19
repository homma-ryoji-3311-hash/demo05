// slice-18 voice-input-stt — UI 層（正本: docs/spec/slice-18.md「画面要件」, approved 2026-07-19）
// S3 業務報告入力（/reports/new）の拡張。STT は Web Speech API（クライアント側・PM 決定 2026-07-15）で、
// 新規サーバ REST は立てない（本文は既存 POST/PATCH /reports で保存）。よって本スライスは frontend 専用＝
// api.spec は無し（新規サーバ契約が無い）。ADR-0018: frontend 未実装のため赤が正常（工程6 で実装して緑にする）。
// 実音声・実録音は使わない。SpeechRecognition はスタブする（合成テキスト・失敗種別で degrade を検証）。
import { test, expect } from '@playwright/test';

// 合成 STT 結果を返す成功スタブ（実音声を使わない）
const successStub = (result: string) =>
  `(() => {
    class FakeSR { start(){ setTimeout(()=>{ this.onresult && this.onresult({ results: [[{ transcript: ${JSON.stringify(result)} }]] }); this.onend && this.onend(); }, 0); } stop(){} abort(){} }
    // @ts-ignore
    window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
  })()`;

// 権限拒否/失敗スタブ（degrade 検証・AC-3）
const failStub = `(() => {
  class FailSR { start(){ setTimeout(()=>{ this.onerror && this.onerror({ error: 'not-allowed' }); this.onend && this.onend(); }, 0); } stop(){} abort(){} }
  // @ts-ignore
  window.SpeechRecognition = FailSR; window.webkitSpeechRecognition = FailSR;
})()`;

test.describe('slice-18 voice-input-stt [ui] — S3 業務報告入力の拡張', () => {
  // AC-1 音声入力の起動操作があり、既存の本文入力欄と併用できる（音声は本文へ追記）
  test('AC-1 自由文モードで音声入力の起動と本文入力欄が併用でき、STT 結果が本文末尾へ追記される', async ({ page }) => {
    await page.addInitScript(successStub('午後はレビュー指摘の修正を実施。'));
    await page.goto('/reports/new');
    const body = page.getByRole('textbox').first();
    await body.fill('午前は環境構築。');
    await expect(page.getByRole('button', { name: /音声入力|録音|マイク/ })).toBeVisible(); // 起動操作は本文欄と併存
    await page.getByRole('button', { name: /音声入力|録音|マイク/ }).click();
    // 取り込み操作（自動確定しない・AC-2）を経て本文末尾へ追記される
    await page.getByRole('button', { name: /取り込|追記|反映|確定/ }).click();
    await expect(body).toHaveValue(/午前は環境構築。[\s\S]*午後はレビュー指摘の修正を実施。/); // 既存本文を消さず末尾へ
  });

  // AC-2 STT 結果は取り込み前に提示され、誤認識を修正できる（自動確定しない）
  test('AC-2 STT 結果は取り込み前に確認・修正でき、自動では本文に入らない', async ({ page }) => {
    await page.addInitScript(successStub('午後はレビュー指摘の修正を実施。'));
    await page.goto('/reports/new');
    const body = page.getByRole('textbox').first();
    await body.fill('午前は環境構築。');
    await page.getByRole('button', { name: /音声入力|録音|マイク/ }).click();
    // STT 結果は確認/修正領域に出る（本文にはまだ入っていない＝自動確定しない）
    await expect(page.getByText(/午後はレビュー指摘の修正を実施。/)).toBeVisible();
    await expect(body).toHaveValue('午前は環境構築。'); // 取り込み前は本文不変
  });

  // AC-3 録音権限拒否・STT 失敗でも入力内容を失わない（degrade・失敗はテキストで提示）
  test('AC-3 権限拒否時は本文を保持し、失敗をテキストで提示する', async ({ page }) => {
    await page.addInitScript(failStub);
    await page.goto('/reports/new');
    const body = page.getByRole('textbox').first();
    await body.fill('午前は環境構築。');
    await page.getByRole('button', { name: /音声入力|録音|マイク/ }).click();
    await expect(page.getByRole('alert')).toContainText(/拒否|失敗|許可|できません/); // 色のみに依存せずテキスト
    await expect(body).toHaveValue('午前は環境構築。'); // 既存本文は保持（degrade で報告は必ず出せる）
  });
});
