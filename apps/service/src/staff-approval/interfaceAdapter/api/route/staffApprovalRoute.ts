import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { StaffApprovalController } from '../controller/staffApprovalController.js';

/**
 * 承認ルーター（slice-17）。/admin 配下: 承認待ち一覧・承認（super admin のみ）。
 * 認証 401 は authUserId、super admin 認可 403 は use-case。REST 形状はオラクルと HTTP 等価。
 */
export function createStaffApprovalRouter(deps: { staffApprovalController: StaffApprovalController }): Router {
  const router = Router();
  const { staffApprovalController: c } = deps;

  router.get('/staff/pending', (req, res, next) => {
    void c
      .pending(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });
  router.post('/staff/:id/approve', (req, res, next) => {
    void c
      .approveStaff(authUserId(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
