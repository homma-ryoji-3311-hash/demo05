import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * 認証ガード（slice-06）。localStorage 'session' が無ければ /login へ誘導する。
 * フェイクのセッション（ログインで staff01 を保存）。本物の OAuth 導入時もこの境界は不変。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = typeof localStorage !== 'undefined' ? localStorage.getItem('session') : null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
