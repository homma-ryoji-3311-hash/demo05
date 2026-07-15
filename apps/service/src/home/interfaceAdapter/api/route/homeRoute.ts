import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { HomeController } from '../controller/homeController.js';

/**
 * ホームルーター（/home にマウント）。protected: authUserId で X-User-Id 必須（空/無しは 401）。
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
