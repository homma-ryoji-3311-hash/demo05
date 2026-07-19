import { Router } from 'express';
import type { ReminderController } from '../controller/reminderController.js';

/**
 * リマインドジョブ trigger（slice-16・POST /jobs/reminder/run）。router → controller → use-case → reader の一方向。
 * REST 形状は downstream の詳細設計（オラクルの URL は semantics fixture・run_at→対象ユーザー/チャネルを合わせる）。
 * 背景ジョブ（システム起点）につき per-user 認可は掛けない——対象は reader が抽出源から引く。
 */
export function createReminderRouter(deps: { reminderController: ReminderController }): Router {
  const router = Router();
  const { reminderController: c } = deps;

  router.post('/reminder/run', (req, res, next) => {
    void c
      .run(req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
