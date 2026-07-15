import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { ReportController } from '../controller/reportController.js';

/**
 * reports ルーター。router → service(use-case) → repository の一方向を守る。
 * 認証 seam: すべて protected。authUserId(req) が X-User-Id を必須で読む（空/無しは 401）。
 * エラーは throw → next 経由で共通の error-handler が HTTP に変換する（401/403/404/409/422/502）。
 * registerRoute は req ヘッダを渡さないため、X-User-Id を読む本ルーターは手書きで結線する。
 * 経路の並び順: 具体パス（/draft, /:id/previous, /:id/summarize, /:id/confirm）を /:id より前に置く。
 */
export function createReportRouter(deps: { reportController: ReportController }): Router {
  const router = Router();
  const { reportController } = deps;

  router.get('/', (req, res, next) => {
    void reportController
      .list(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  // GET /reports/draft は '/:id' より前に置く。
  router.get('/draft', (req, res, next) => {
    void reportController
      .draft(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.post('/', (req, res, next) => {
    void reportController
      .create(authUserId(req), req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.get('/:id/previous', (req, res, next) => {
    void reportController
      .previous(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.post('/:id/summarize', (req, res, next) => {
    void reportController
      .summarize(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.post('/:id/confirm', (req, res, next) => {
    void reportController
      .confirm(authUserId(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.get('/:id', (req, res, next) => {
    void reportController
      .detail(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.patch('/:id', (req, res, next) => {
    void reportController
      .update(authUserId(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
