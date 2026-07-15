/**
 * orval の custom fetch mutator。
 * すべての API 呼び出しがここを通る。認証トークンの付与など横断的な処理はここに集約する。
 */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  // 認証 seam（フェイクの固定セッション）。
  // backend は X-User-Id が空だと 401 を返すため、全リクエストに固定のスタッフ ID を付与する。
  // 本物の OAuth セッションを導入するまでの差し込み口（ここだけを差し替えればよい）。
  if (!headers.has('X-User-Id')) {
    headers.set('X-User-Id', 'staff01');
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
