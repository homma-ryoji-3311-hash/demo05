import type { ListPendingStaffUseCase } from '../../../use-case/listPendingStaff.js';
import type { ApproveStaffUseCase } from '../../../use-case/approveStaff.js';
import type { StaffAccountView } from '../../../domain/model/staffApproval.js';

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-17 承認）。
 * 未認証 401 は route の authUserId、super admin 認可 403・不正ロール 422・未存在 404 は use-case/ドメイン。
 */
export class StaffApprovalController {
  constructor(
    private readonly list: ListPendingStaffUseCase,
    private readonly approve: ApproveStaffUseCase,
  ) {}

  async pending(userId: string): Promise<{ status: number; body: { pending: StaffAccountView[] } }> {
    const body = await this.list.execute({ userId });
    return { status: 200, body };
  }

  async approveStaff(
    approverId: string,
    staffId: string,
    body: unknown,
  ): Promise<{ status: number; body: StaffAccountView }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const assignment = (b.assignment ?? {}) as Record<string, unknown>;
    const view = await this.approve.execute({
      approverId,
      staffId,
      assignmentRole: assignment.role,
      channel: b.channel,
      cycle: b.cycle,
    });
    return { status: 200, body: view };
  }
}
