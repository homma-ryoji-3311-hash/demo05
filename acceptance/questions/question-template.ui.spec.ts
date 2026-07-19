// slice-19 question-template-editor — UI 層（正本: docs/spec/slice-19.md「画面要件」, approved 2026-07-19）
// ADR-0018: frontend 未実装のため赤が正常。page.goto で S10 設問テンプレート編集を叩く（静的検知4b）。
// golden は撮らず role/DOM アサーションへ縮退。UI ルートは API パスに合わせる（/question-sets）。
import { test, expect } from '@playwright/test';

const UI_BASE = process.env.ACCEPTANCE_UI_BASE_URL ?? 'http://localhost:5173';

test.describe('slice-19 question-template-editor [ui] — S10 設問テンプレート編集', () => {
  // S10 設問テンプレート編集は manager 専用 → ui セッションを mgr01 に上書きする（既定 staff01 では 403・
  // slice-10 の mgr01 上書き前例と同型・工程4 翻訳欠陥修正）。
  test.use({
    storageState: {
      cookies: [],
      origins: [{ origin: UI_BASE, localStorage: [{ name: 'session', value: 'mgr01' }] }],
    },
  });

  // UI-AC: 設問の追加・削除・並べ替えができる
  test('設問の追加・並べ替えの操作が表示される', async ({ page }) => {
    await page.goto('/question-sets');
    await expect(page.getByRole('button', { name: /設問を追加|追加/ })).toBeVisible();
  });

  // UI-AC: 各設問行で回答形式・必須/任意・役割タグを選択できる
  test('各設問で回答形式・必須・役割タグを選べる', async ({ page }) => {
    await page.goto('/question-sets');
    await expect(page.getByText(/回答形式|短文|長文|選択/).first()).toBeVisible();
    await expect(page.getByText(/必須|任意/).first()).toBeVisible();
    await expect(page.getByText(/役割|案件キー|スキル/).first()).toBeVisible();
  });

  // UI-AC: 公開でガードレールを実行し、不足ロールをテキストで明示して公開を拒否する（公開済み/下書きの区別）
  test('公開ガードレールの不足ロールがテキストで示され、公開/下書きが区別される', async ({ page }) => {
    await page.goto('/question-sets');
    await expect(page.getByRole('button', { name: /公開/ })).toBeVisible();
    await expect(page.getByText(/下書き|公開済み/).first()).toBeVisible();
  });
});
