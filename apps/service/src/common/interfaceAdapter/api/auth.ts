import type { NextFunction, Request, Response } from 'express';
import { HttpException } from './httpException.js';

/**
 * 認証済みユーザー ID を取り出す共通ヘルパ（slice-06 の認証 seam）。
 * 外部プロバイダは決定的フェイク（PM決定）: `X-User-Id` ヘッダを認証済みユーザーとして読む。
 * 空/無しは未認証として 401（HttpException）を throw する。protected route（reports/home/me）で使う。
 * public は health と /auth/google/callback のみ（これらは本ヘルパを呼ばない）。
 */
export function authUserId(req: Request): string {
  const uid = req.header('x-user-id')?.trim();
  if (!uid) throw new HttpException(401, 'unauthenticated');
  return uid;
}

/**
 * 保護ルート群の前段に置く認証ミドルウェア（slice-06 AC-3）。
 * 未認証（X-User-Id 空/無し）なら 401 で短絡する。これにより GET /reports のように
 * ハンドラ未実装のパスでも「未認証 → 401」を満たせる（オラクルのグローバル保護ガードと同義）。
 * app.ts で /me・/reports など保護マウントの前に app.use する。認可（所有権 403）は各 use-case が担う。
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    authUserId(req); // 空/無しは 401 を throw
    next();
  } catch (err) {
    next(err);
  }
}
