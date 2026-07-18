/**
 * フロントのセッション seam（slice-06）。
 * 決定的フェイク: ログイン時にユーザー ID を localStorage 'session' に保存し、
 * apiFetch（common/api/client.ts）がそれを X-User-Id として backend に送る。
 * 実 OAuth 導入時はここ（保存する値の出所）を差し替える。キー名は client.ts と一致させる。
 */
const SESSION_KEY = 'session';

export function getSession(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setSession(userId: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, userId);
}

export function clearSession(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
}

/** ログイン済みか（セッションを持つか）。RequireAuth のガード判定に使う。 */
export function isAuthenticated(): boolean {
  return Boolean(getSession());
}
