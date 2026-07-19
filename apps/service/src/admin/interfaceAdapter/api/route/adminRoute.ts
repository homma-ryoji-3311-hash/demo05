import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { AdminController } from '../controller/adminController.js';

/**
 * admin ルーター（slice-14: スタッフ一覧）。
 * router → controller → use-case → repository の一方向を守る。
 * 認証 seam: protected。authUserId(req) が X-User-Id を必須で読む（空/無しは 401・AC-4）。
 * 認可（manager 以外 → 403）は use-case が担う。`?group` でタブ絞り込み（AC-3）。
 * エラーは throw → next 経由で共通 error-handler が HTTP 化（403/401）。
 */
export function createAdminRouter(deps: { adminController: AdminController }): Router {
  const router = Router();
  const { adminController } = deps;

  router.get('/staff', (req, res, next) => {
    // ?group は単一値。複数指定（配列）は先頭を採る（オラクル searchParams.get('group') と同義・parity）。
    const rawGroup = req.query.group;
    const group =
      typeof rawGroup === 'string'
        ? rawGroup
        : Array.isArray(rawGroup) && typeof rawGroup[0] === 'string'
          ? rawGroup[0]
          : undefined;
    void adminController
      .listStaff(authUserId(req), group)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
