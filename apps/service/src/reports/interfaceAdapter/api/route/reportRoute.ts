import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { ReportController } from '../controller/reportController.js';

/**
 * reports ルーター（slice-01: 作成・更新・下書き取得／slice-02: 要約・1件取得／slice-03: 確定）。
 * router → service(use-case) → repository の一方向を守る。
 * 認証 seam: すべて protected。authUserId(req) が X-User-Id を必須で読む（空/無しは 401）。
 * エラーは throw → next 経由で共通の error-handler が HTTP に変換する（401/404/409/422/502）。
 * 経路順: 具体パス（/draft）を動的パス（/:id）より前に置く。
 * previous は後続スライスで足す。
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

  router.post('/:id/confirm', (req, res, next) => {
    void reportController
      .confirm(authUserId(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  // slice-20: ソフト設問回答の保存（本人のみ）。雑感・スコアは応答に出さない。
  router.post('/:id/soft-answers', (req, res, next) => {
    void reportController
      .softAnswers(authUserId(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  // slice-20: 雑感の閲覧（最小ロール・private は本人のみ・担当外は 403）。/:id より前・具体パス優先。
  router.get('/:id/zakkan', (req, res, next) => {
    void reportController
      .zakkan(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  // GET /reports/:id/previous は前回参照（slice-05）。/:id より前・具体パス優先。
  router.get('/:id/previous', (req, res, next) => {
    void reportController
      .previous(authUserId(req), req.params.id)
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
