// slice-06 auth-authz — API 層（正本: docs/spec/slice-06.md, approved）
// 外部 OAuth は決定的フェイク（PM決定）。callback に email を渡してドメイン判定を検証する。
import { test, expect } from '@playwright/test';

test.describe('slice-06 auth-authz [api]', () => {
  // AC-1 許可ドメインのアカウントはログインでき、セッションが発行され users に upsert される
  test('AC-1 許可ドメインの callback は 200＋user＋session', async ({ request }) => {
    const res = await request.get('/auth/google/callback?email=staff01@example.test');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe('staff01@example.test');
    expect(typeof body.session).toBe('string');
  });

  // AC-2 許可ドメイン外・招待外はログインできない（403）
  test('AC-2 許可外ドメインの callback は 403', async ({ request }) => {
    const res = await request.get('/auth/google/callback?email=outsider@other.test');
    expect(res.status()).toBe(403);
  });

  // AC-3 未認証で保護 API を呼ぶと 401（X-User-Id を外す）
  test('AC-3 未認証の保護 API は 401', async ({ request }) => {
    const res = await request.get('/me', { headers: { 'X-User-Id': '' } });
    expect(res.status()).toBe(401);
  });

  // AC-4 他人のデータへのアクセスは 403（バックエンド強制）
  test('AC-4 他人の報告アクセスは 403', async ({ request }) => {
    const res = await request.get('/reports/r_other'); // r_other は staff02 所有
    expect(res.status()).toBe(403);
  });
});
