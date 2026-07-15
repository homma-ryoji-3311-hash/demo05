import { Router, type Request } from 'express';
import type { ReportController } from '../controller/reportController.js';

// slice-01 は seeded fixture user 前提（認証の本実装は slice-06 で被せる・レジストリ方針）。
// 受け入れテストは X-User-Id ヘッダを送る。無い場合は fixture user にフォールバックする。
const FIXTURE_USER = 'staff01';
const userOf = (req: Request): string => req.header('x-user-id')?.trim() || FIXTURE_USER;

/**
 * reports ルーター。router → service(use-case) → repository の一方向を守る。
 * エラーは throw → next 経由で共通の error-handler が HTTP に変換する（422/409/404）。
 * registerRoute は req ヘッダを渡さないため、X-User-Id を読む本ルーターは手書きで結線する。
 */
export function createReportRouter(deps: { reportController: ReportController }): Router {
  const router = Router();
  const { reportController } = deps;

  // GET /reports/draft は '/:id' より前に置く（将来 GET /:id を足すときのため）。
  router.get('/draft', (req, res, next) => {
    void reportController
      .draft(userOf(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.post('/', (req, res, next) => {
    void reportController
      .create(userOf(req), req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.patch('/:id', (req, res, next) => {
    void reportController
      .update(userOf(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
