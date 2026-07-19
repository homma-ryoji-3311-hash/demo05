import { Router } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { GroupSettingController } from '../controller/groupSettingController.js';

/** /groups 配下: グループ設定の取得・編集（編集は担当 manager のみ・use-case が 403）。 */
export function createGroupSettingRouter(deps: { groupSettingController: GroupSettingController }): Router {
  const router = Router();
  const { groupSettingController: c } = deps;

  router.get('/:id/settings', (req, res, next) => {
    void c
      .get(req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });
  router.put('/:id/settings', (req, res, next) => {
    void c
      .update(authUserId(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}

/** /report-snapshots 配下: 過去の確定報告スナップショット取得（不変履歴・read-only）。 */
export function createReportSnapshotRouter(deps: { groupSettingController: GroupSettingController }): Router {
  const router = Router();
  const { groupSettingController: c } = deps;

  router.get('/:id', (req, res, next) => {
    void c
      .snapshot(req.params.id)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}

/** /admin 配下: スタッフのグループ移管（manager のみ・過去 snapshot は不変）。 */
export function createStaffTransferRouter(deps: { groupSettingController: GroupSettingController }): Router {
  const router = Router();
  const { groupSettingController: c } = deps;

  router.post('/staff/:id/transfer', (req, res, next) => {
    void c
      .transferStaff(authUserId(req), req.params.id, req.body)
      .then((r) => res.status(r.status).json(r.body))
      .catch(next);
  });

  return router;
}
