/**
 * orval の custom fetch mutator。
 * すべての API 呼び出しがここを通る。認証トークンの付与など横断的な処理はここに集約する。
 */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  // 認証差し込み口（今回はスコープ外）。将来ここでトークンを付与する:
  // headers.set('Authorization', `Bearer ${getToken()}`);

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
