import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { AuthController } from '../controller/authController.js';

/**
 * 認証ルーター（slice-06）。
 * - /auth/google/callback は**公開**（認証ミドルウェアを通さない）。許可外ドメインは use-case が 403。
 * - /me は**保護**。app.ts で requireAuth を前置し、ここでは認証済み userId を authUserId で取り出す。
 * router → controller → use-case の一方向を守る（ADR-0011）。エラーは throw → next → 共通 error-handler。
 */

/** 公開ルーター。/auth にマウントする。 */
export function createAuthRouter(deps: { authController: AuthController }): Router {
  const router = Router();
  const { authController } = deps;

  router.get('/google/callback', (req, res, next) => {
    void authController
      .googleCallback(req.query.email)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}

/** 保護ルーター。/me にマウントする（前段の requireAuth が 401 を担保する）。 */
export function createMeRouter(deps: { authController: AuthController }): Router {
  const router = Router();
  const { authController } = deps;

  router.get('/', (req, res, next) => {
    void authController
      .me(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
