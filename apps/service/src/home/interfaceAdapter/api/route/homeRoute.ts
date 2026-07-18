import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { HomeController } from '../controller/homeController.js';

/**
 * home ルーター（slice-07）。protected: authUserId(req) が X-User-Id を必須で読む（空/無しは 401）。
 * router → controller → use-case の一方向を守る（ADR-0011）。
 * エラーは throw → next 経由で共通の error-handler が HTTP に変換する。
 */
export function createHomeRouter(deps: { homeController: HomeController }): Router {
  const router = Router();
  const { homeController } = deps;

  router.get('/', (req, res, next) => {
    void homeController
      .home(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
