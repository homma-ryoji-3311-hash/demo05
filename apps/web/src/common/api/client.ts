/**
 * orval の custom fetch mutator。
 * すべての API 呼び出しがここを通る。認証トークンの付与など横断的な処理はここに集約する。
 */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  // 認証 seam（フェイクのセッション）。ログイン時に localStorage 'session' へ保存したユーザー ID を
  // X-User-Id として送る。未ログイン（session なし）なら付与しない → backend は 401。
  // 本物の OAuth 導入（slice-06）時にここを差し替える。
  if (!headers.has('X-User-Id')) {
    const session = typeof localStorage !== 'undefined' ? localStorage.getItem('session') : null;
    if (session) headers.set('X-User-Id', session);
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`);
  }

  // 204 No Content 等はボディなし
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export default apiFetch;
