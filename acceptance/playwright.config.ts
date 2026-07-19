import { defineConfig } from '@playwright/test';

// 接続先は環境変数で切替（ADR-0005・0018）:
//   ACCEPTANCE_BASE_URL     … API 層（reference-mock :8000 / backend :3000）
//   ACCEPTANCE_UI_BASE_URL  … 画面層（frontend :5173）
// 同じスイートが reference-mock に対して緑・実装前 backend に対して赤になる反転が
// 「翻訳が正しい」ことの機械的証明（ただし API 層のみ。UI 層は answer key を持たない）。
const API_BASE = process.env.ACCEPTANCE_BASE_URL ?? 'http://localhost:8000';
const UI_BASE = process.env.ACCEPTANCE_UI_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  // list は人間向け。json は Stop ゲート（.claude/hooks/stop-gate.sh）が現スライスの spec に
  // 帰属判定するために常設する。出力は acceptance/test-results/results.json（config 相対）。
  // これで全スイート実行でも未実装スライスの赤で完了がブロックされない（ADR-0018）。
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  projects: [
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts$/,
      // 受け入れテストは fixture user（staff01）として認証済みで走る（レジストリ方針）。
      // slice-06 のみ個別リクエストでヘッダを外して 401 を検証する。
      use: { baseURL: API_BASE, extraHTTPHeaders: { 'X-User-Id': 'staff01' } },
    },
    {
      name: 'ui',
      testMatch: /.*\.ui\.spec\.ts$/,
      // ui は既定で「認証済み（fixture セッション staff01）」で走る。
      // frontend の認証ガードと apiFetch が localStorage 'session' を読む。
      // 未認証の挙動（保護画面→/login）を検証する auth.ui.spec だけが storageState を空に上書きする。
      use: {
        browserName: 'chromium',
        baseURL: UI_BASE,
        storageState: {
          cookies: [],
          origins: [{ origin: UI_BASE, localStorage: [{ name: 'session', value: 'staff01' }] }],
        },
      },
    },
  ],
});
