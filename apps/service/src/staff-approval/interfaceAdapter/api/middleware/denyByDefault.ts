import type { RequestHandler } from 'express';
import { authUserId } from '../../../../common/interfaceAdapter/api/auth.js';
import type { StaffAccountRepositoryInterface } from '../../../domain/interface/staffAccountRepository.js';

/**
 * deny-by-default（slice-17 AC-1/AC-3）。未承認（pending）は保護ルートで 403（`pending_approval`）。
 * requireAuth の後段に1回だけ挿し、`/me` には掛けない（承認待ち画面が自分の状態を知れるため）。
 * レコードが無い id は active 扱いで通過（既存ユーザー不変）。承認で status=active になると通過する（AC-3）。
 * 画面制御に依存せずミドルウェア層で強制する（バックエンド強制）。
 */
export function denyByDefault(repo: StaffAccountRepositoryInterface): RequestHandler {
  return (req, res, next) => {
    void (async () => {
      const account = await repo.findById(authUserId(req));
      if (account?.status === 'pending') {
        res.status(403).json({ error: 'pending_approval' });
        return;
      }
      next();
    })().catch(next);
  };
}
