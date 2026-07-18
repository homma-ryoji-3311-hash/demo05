import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { SkillSheetController } from '../controller/skillSheetController.js';

/**
 * skill-sheets ルーター（slice-08: 生成）。router → service(use-case) → repository の一方向を守る。
 * 認証 seam: protected。authUserId(req) が X-User-Id を必須で読む（空/無しは 401・AC-5）。
 * 認可（他人の staff_id → 403）は use-case。エラーは throw → next 経由で共通 error-handler が HTTP 化。
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

  return router;
}
