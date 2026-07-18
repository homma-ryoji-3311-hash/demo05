// slice-06 auth-authz — API 層（正本: docs/spec/slice-06.md, approved）
// 外部 OAuth は決定的フェイク（PM決定）。callback に email を渡してドメイン判定を検証する。
// 認可の実質を固定する（#25 の翻訳欠陥修正・2026-07-18）:
//   - AC-1 は未登録ユーザーで upsert の insert 分岐を通し role 付与を assert（D-2）
//   - AC-3 は /me だけでなく /reports でも 401（「保護 API など」＝複数点・D-1b）
//   - AC-4 は読み取りだけでなく書き込み（PATCH）でも 403（他人の報告を書き換えられない・D-1a）
//   - AC-2 は 403 に加えセッション非発行を assert（D-4）／ /me のレスポンス形を固定（D-5）
import { test, expect } from '@playwright/test';

test.describe('slice-06 auth-authz [api]', () => {
  // AC-1 許可ドメインのアカウントはログインでき、users に upsert（role 付与）＋セッション発行。
  // フィクスチャ表どおり未登録の staffA を使い、insert 分岐と role を実際に通す（D-2）。
  test('AC-1 許可ドメインの callback は 200＋upsert（role 付与）＋session', async ({ request }) => {
    const res = await request.get('/auth/google/callback?email=staffA@example.test');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user.email.toLowerCase()).toBe('staffa@example.test');
    expect(body.user.id).toBeTruthy(); // upsert された新規 user が id を持つ
    expect(body.user.role).toBe('staff'); // Then「role 付与」の実質
    expect(typeof body.session).toBe('string');
    expect(body.session.length).toBeGreaterThan(0);
  });

  // AC-2 許可ドメイン外・招待外はログインできない（403）＋アプリのセッションは発行されない（D-4）
  test('AC-2 許可外ドメインの callback は 403 でセッションを発行しない', async ({ request }) => {
    const res = await request.get('/auth/google/callback?email=outsider@other.test');
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.session).toBeUndefined();
  });

  // AC-3 未認証で保護 API を呼ぶと 401。仕様表は「GET /reports など保護 API」＝1点ではない（D-1b）。
  test('AC-3 未認証の保護 API は複数点で 401（/me と /reports）', async ({ request }) => {
    const me = await request.get('/me', { headers: { 'X-User-Id': '' } });
    expect(me.status()).toBe(401);
    const list = await request.get('/reports', { headers: { 'X-User-Id': '' } });
    expect(list.status()).toBe(401);
  });

  // AC-4 他人のデータへのアクセスは 403（バックエンド強制）。読み取りだけでなく書き込みも塞ぐ（D-1a）。
  // r_other は staff02 所有／既定ヘッダは staff01。
  test('AC-4 他人の報告は読み取りも書き込みも 403', async ({ request }) => {
    const get = await request.get('/reports/r_other');
    expect(get.status()).toBe(403);
    const patch = await request.patch('/reports/r_other', { data: { raw_text: '改ざん' } });
    expect(patch.status()).toBe(403); // 他人の報告を PATCH で書き換えられない
  });

  // /me の 200 レスポンス形を固定する（D-5・実装者が形を推測せずに済む）。
  test('/me は認証済みユーザーの id/role/name を返す', async ({ request }) => {
    const res = await request.get('/me'); // 既定ヘッダ X-User-Id: staff01
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('staff01');
    expect(body.role).toBe('staff');
    expect(typeof body.name).toBe('string');
    expect(body.name.length).toBeGreaterThan(0);
  });
});
