import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { ReportStatusController } from '../controller/reportStatusController.js';

/**
 * report-status ルーター（slice-15）。router → controller → use-case → repository の一方向。
 * 認証は authUserId が担保（401）。manager 認可 403・不正サイクル 422 は use-case/ドメイン。
 * REST パスは semantics fixture（phase2-design §7 の実装時詳細設計・オラクルと状態遷移を合わせる）。
 */

/** /admin 配下: サイクル設定/取得・報告漏れ計上・欠勤承認（manager のみ）。 */
export function createAdminReportStatusRouter(deps: { reportStatusController: ReportStatusController }): Router {
  const router = Router();
  const { reportStatusController: c } = deps;

  router.put('/report-cycles/:staffId', (req, res, next) => {
    void c
      .putCycle(authUserId(req), req.params.staffId, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });
  router.get('/report-cycles/:staffId', (req, res, next) => {
    void c
      .getCycleById(authUserId(req), req.params.staffId)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });
  router.post('/report-status/:oppId/flag-missing', (req, res, next) => {
    void c
      .flagMissing(authUserId(req), req.params.oppId)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });
  router.post('/report-status/:oppId/approve-absence', (req, res, next) => {
    void c
      .approveAbsence(authUserId(req), req.params.oppId)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}

/** /me 配下: 本人の履行状況を read-only 閲覧（AC-6）。 */
export function createMyReportStatusRouter(deps: { reportStatusController: ReportStatusController }): Router {
  const router = Router();
  const { reportStatusController: c } = deps;

  router.get('/report-status', (req, res, next) => {
    void c
      .myStatus(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
