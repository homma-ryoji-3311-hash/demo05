import type { ListAdminStaffUseCase } from '../../../use-case/listAdminStaff.js';
import type { AdminStaffRow } from '../../../domain/model/adminStaffRow.js';

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-14 管理者コンソール）。
 * Express の Request/Response には依存しない（戻り値を route が送出する）。
 * 未認証 401 は route の authUserId、manager 認可 403 は use-case が担う。
 */
export class AdminController {
  constructor(private readonly listAdminStaff: ListAdminStaffUseCase) {}

  async listStaff(
    userId: string,
    group: string | undefined,
  ): Promise<{ status: number; body: { groups: string[]; staff: AdminStaffRow[] } }> {
    const result = await this.listAdminStaff.execute({ userId, group });
    return { status: 200, body: result };
  }
}
