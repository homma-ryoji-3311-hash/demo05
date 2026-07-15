import type { Request } from 'express';
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
