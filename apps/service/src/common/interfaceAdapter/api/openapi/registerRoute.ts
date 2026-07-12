import type { NextFunction, Request, Response, Router } from 'express';
import type { RouteContract } from './contractTypes.js';

export interface ValidatedInput {
  body: unknown;
  params: unknown;
  query: unknown;
}

export interface HandlerResult<T = unknown> {
  status: number;
  body: T;
}

export type RouteHandler = (input: ValidatedInput) => Promise<HandlerResult>;

/**
 * コントラクトから Express ルートを 1 本生成する。
 * - request.body/params/query があれば Zod で parse（失敗時は throw → next）
 * - 検証済み input をハンドラに渡し、戻り値の status/body を送出
 * - ドメインエラー等はハンドラが throw し、next 経由で共通の error-handler が一元処理する
 */
export function registerRoute(router: Router, contract: RouteContract, handler: RouteHandler): void {
  const route = router.route(contract.path);
  route[contract.method]((req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      const input: ValidatedInput = {
        body: contract.request?.body ? contract.request.body.parse(req.body) : req.body,
        params: contract.request?.params ? contract.request.params.parse(req.params) : req.params,
        query: contract.request?.query ? contract.request.query.parse(req.query) : req.query,
      };
      const result = await handler(input);
      res.status(result.status).json(result.body);
    })().catch((err: unknown) => next(err));
  });
}
