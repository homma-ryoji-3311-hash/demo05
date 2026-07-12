import { AsyncLocalStorage } from 'node:async_hooks';

/** リクエスト単位で持ち回すコンテキスト。ログに request_id を自動注入するために使う。 */
export interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** 与えたコンテキスト下で fn を実行する（リクエストごとにミドルウェアが呼ぶ）。 */
export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

/** 現在のリクエストコンテキストを取得する。コンテキスト外なら undefined。 */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}
