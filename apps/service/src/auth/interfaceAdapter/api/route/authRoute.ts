import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { AuthController } from '../controller/authController.js';

/**
 * 認証ルーター（root マウント）。
 * - GET /auth/google/callback … public（認証不要・許可外ドメインは 403）
 * - GET /me                   … protected（authUserId で X-User-Id 必須・空/無しは 401）
 */
export function createAuthRouter(deps: { authController: AuthController }): Router {
  const router = Router();
  const { authController } = deps;

  router.get('/auth/google/callback', (req, res, next) => {
    const email = typeof req.query.email === 'string' ? req.query.email : '';
    void authController
      .callback(email)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.get('/me', (req, res, next) => {
    void authController
      .me(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
