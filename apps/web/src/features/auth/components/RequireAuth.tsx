import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../session';

/**
 * 認証ガード（slice-06 UI-AC）。未ログインでは保護画面を描画せず /login へ誘導する。
 * ルーターで保護ルート（/reports/new 等）の element をこれで包む。
 * backend も未認証を 401 で塞ぐ（多層防御）。ここはあくまで画面遷移の UX。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
