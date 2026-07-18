import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { SkillSheetController } from '../controller/skillSheetController.js';

/**
 * skill-sheets ルーター（slice-08: 生成／slice-09: 一覧・DL・プレビュー）。
 * router → service(use-case) → repository の一方向を守る。
 * 認証 seam: protected。authUserId(req) が X-User-Id を必須で読む（空/無しは 401・AC-5/AC-4）。
 * 認可（他人 → 403・無し → 404）は use-case。エラーは throw → next 経由で共通 error-handler が HTTP 化。
 * 経路順: 具体パス（/:id/download・/:id/preview）を root（/）と衝突させない（bare /:id は持たない）。
 */
export function createSkillSheetRouter(deps: { skillSheetController: SkillSheetController }): Router {
  const router = Router();
  const { skillSheetController } = deps;

  router.post('/', (req, res, next) => {
    void skillSheetController
      .create(authUserId(req), req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  // GET /skill-sheets — 自分の生成済み一覧（slice-09 AC-1）
  router.get('/', (req, res, next) => {
    void skillSheetController
      .list(authUserId(req))
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  // GET /skill-sheets/:id/download — 元 xlsx の署名付き URL（slice-09 AC-2）
  router.get('/:id/download', (req, res, next) => {
    void skillSheetController
      .download(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  // GET /skill-sheets/:id/preview — HTML プレビュー（slice-09 AC-5・元 xlsx は渡さない）
  router.get('/:id/preview', (req, res, next) => {
    void skillSheetController
      .preview(authUserId(req), req.params.id)
      .then((r) => res.status(r.status).type('html').send(r.html))
      .catch(next);
  });

  return router;
}
