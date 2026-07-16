import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { ReportController } from '../controller/reportController.js';

/**
 * reports ルーター（slice-01: 作成・更新・下書き取得／slice-02: 要約・1件取得）。
 * router → service(use-case) → repository の一方向を守る。
 * 認証 seam: すべて protected。authUserId(req) が X-User-Id を必須で読む（空/無しは 401）。
 * エラーは throw → next 経由で共通の error-handler が HTTP に変換する（401/404/409/422/502）。
 * 経路順: 具体パス（/draft）を動的パス（/:id）より前に置く。
 * 一覧(GET /)・confirm・previous は後続スライスで足す。
 */
export function createReportRouter(deps: { reportController: ReportController }): Router {
  const router = Router();
  const { reportController } = deps;

  // GET /reports/draft は動的パスより前に置く。
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

  router.patch('/:id', (req, res, next) => {
    void reportController
      .update(authUserId(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.post('/:id/summarize', (req, res, next) => {
    void reportController
      .summarize(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.get('/:id', (req, res, next) => {
    void reportController
      .get(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
