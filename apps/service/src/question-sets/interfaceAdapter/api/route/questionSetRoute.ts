import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { QuestionSetController } from '../controller/questionSetController.js';

/**
 * 設問セットルーター（slice-19・/question-sets）。router → controller → use-case → repository の一方向。
 * 認証 401 は authUserId、manager 認可 403・不正/ガードレール 422 は use-case/ドメイン。REST はオラクルと HTTP 等価。
 */
export function createQuestionSetRouter(deps: { questionSetController: QuestionSetController }): Router {
  const router = Router();
  const { questionSetController: c } = deps;

  router.post('/', (req, res, next) => {
    void c
      .createSet(authUserId(req), req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });
  router.put('/:id', (req, res, next) => {
    void c
      .updateSet(authUserId(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });
  router.get('/:id', (req, res, next) => {
    void c
      .getSet(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });
  router.post('/:id/publish', (req, res, next) => {
    void c
      .publishSet(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
