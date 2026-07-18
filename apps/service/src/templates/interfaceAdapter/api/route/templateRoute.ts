import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { TemplateController } from '../controller/templateController.js';

/**
 * templates ルーター（slice-10: アップロード・有効版切替・一覧）。
 * router → service(use-case) → repository の一方向を守る。
 * 認証 seam: protected。authUserId(req) が X-User-Id を必須で読む（空/無しは 401・AC-4）。
 * 認可（manager 以外 → 403）は use-case が担う（id 参照より先に判定＝staff の切替は 403）。
 * エラーは throw → next 経由で共通 error-handler が HTTP 化（403/404/422/401）。
 */
export function createTemplateRouter(deps: { templateController: TemplateController }): Router {
  const router = Router();
  const { templateController } = deps;

  router.post('/', (req, res, next) => {
    void templateController
      .upload(authUserId(req), req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.get('/', (req, res, next) => {
    void templateController
      .list(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  router.put('/:id/activate', (req, res, next) => {
    void templateController
      .activate(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
