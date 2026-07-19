import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { NotificationSettingsController } from '../controller/notificationSettingsController.js';

/**
 * notification-settings ルーター（slice-13: 取得・更新）。
 * router → controller → use-case → repository の一方向を守る。
 * 認証 seam: protected。authUserId(req) が X-User-Id を必須で読む（空/無しは 401・AC-4）。
 * 設定は user_id に紐づき本人のみ（専用パスに :id を持たせない＝他人の設定を対象にできない）。
 * エラーは throw → next 経由で共通 error-handler が HTTP 化（422/401）。
 */
export function createNotificationSettingsRouter(deps: {
  notificationSettingsController: NotificationSettingsController;
}): Router {
  const router = Router();
  const { notificationSettingsController } = deps;

  router.get('/', (req, res, next) => {
    void notificationSettingsController
      .get(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.put('/', (req, res, next) => {
    void notificationSettingsController
      .put(authUserId(req), req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
