// slice-13 notification-settings — API 層（正本: docs/spec/slice-13.md, approved 2026-07-19）
// GET/PUT /notification-settings。リマインド時刻は「保存 UTC・表示/判定ローカル」（spec.md §3.8）。
// REST 契約（エンドポイント・ステータス・レスポンス形）は source: PM（仕様表「画面要件」外の HTTP 契約として pin）。
//
// 並列干渉の回避（acceptance は fullyParallel）:
//   通知設定は user_id 単位で保存され、案件キーのようなサブキーが無い。よって各テストは
//   X-User-Id を分けて独立させる（未知ユーザーは既定値・TZ は Asia/Tokyo 既定）。
//   AC-4 の 401 は X-User-Id を空にして検証する。
import { test, expect } from '@playwright/test';

const asUser = (uid: string) => ({ headers: { 'X-User-Id': uid } });

test.describe('slice-13 notification-settings [api]', () => {
  // AC-1 自分の通知設定を取得できる（未設定は既定値）
  test('AC-1 GET は 200 で 時刻・Slack/メール・TZ を返す（未設定=既定値）', async ({ request }) => {
    const res = await request.get('/notification-settings', asUser('ns_ac1'));
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.remind_time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/); // 表示ローカルの HH:MM
    expect(typeof body.slack_enabled).toBe('boolean');
    expect(typeof body.email_enabled).toBe('boolean');
    expect(body.timezone).toBe('Asia/Tokyo');
  });

  // AC-2 更新できる（時刻・Slack/メールの ON/OFF）
  test('AC-2 PUT は 200 で更新値を保存し、再取得で保たれる', async ({ request }) => {
    const put = await request.put('/notification-settings', {
      ...asUser('ns_ac2'),
      data: { remind_time: '07:30', slack_enabled: false, email_enabled: true },
    });
    expect(put.status()).toBe(200);
    const saved = await put.json();
    expect(saved.remind_time).toBe('07:30');
    expect(saved.slack_enabled).toBe(false);
    expect(saved.email_enabled).toBe(true);

    const again = await (await request.get('/notification-settings', asUser('ns_ac2'))).json();
    expect(again.remind_time).toBe('07:30');
    expect(again.slack_enabled).toBe(false);
    expect(again.email_enabled).toBe(true);
  });

  // AC-2 時刻形式が不正なら 422（保存しない）
  test('AC-2 不正な時刻形式（25:99）は 422', async ({ request }) => {
    const res = await request.put('/notification-settings', {
      ...asUser('ns_ac2b'),
      data: { remind_time: '25:99', slack_enabled: true },
    });
    expect(res.status()).toBe(422);
  });

  // AC-3 保存 UTC・表示/判定ローカルで往復一貫（Asia/Tokyo 18:00 ⇄ 09:00Z）
  test('AC-3 ローカル 18:00 は UTC 09:00 に正規化され往復で保たれる', async ({ request }) => {
    const put = await request.put('/notification-settings', {
      ...asUser('ns_ac3'),
      data: { remind_time: '18:00' },
    });
    expect(put.status()).toBe(200);
    const body = await put.json();
    expect(body.remind_time).toBe('18:00'); // 表示ローカル
    expect(body.remind_time_utc).toBe('09:00'); // 保存 UTC（Asia/Tokyo=+9）＝下流に UTC 正規化を強制

    const again = await (await request.get('/notification-settings', asUser('ns_ac3'))).json();
    expect(again.remind_time).toBe('18:00'); // 往復でローカル時刻が保たれる
    expect(again.remind_time_utc).toBe('09:00');
  });

  // AC-4 未認証は 401（画面制御でなくバックエンドで強制）
  test('AC-4 未認証（X-User-Id 空）は 401', async ({ request }) => {
    const get = await request.get('/notification-settings', asUser(''));
    expect(get.status()).toBe(401);
    const put = await request.put('/notification-settings', { ...asUser(''), data: { remind_time: '18:00' } });
    expect(put.status()).toBe(401);
  });
});
