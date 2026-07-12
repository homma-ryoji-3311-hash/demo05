import { Router } from 'express';
import type { GreetingController } from '../controller/greetingController.js';
import { registerRoute } from '../../../../common/interfaceAdapter/api/openapi/registerRoute.js';
import { greetingContract } from '../contract/greetingContract.js';

/**
 * コントラクトとハンドラを結線するだけ。パス・検証・OpenAPI は greetingContract が単一ソース。
 * エラーは共通の error-handler（大本の1個）が処理するので、ここでは変換しない。
 * 認証・権限ミドルウェアが必要になればここで付ける。
 */
export function createGreetingRouter(deps: { greetingController: GreetingController }): Router {
  const router = Router();
  const { greetingController } = deps;

  registerRoute(router, greetingContract.hello, () => greetingController.hello());

  return router;
}
