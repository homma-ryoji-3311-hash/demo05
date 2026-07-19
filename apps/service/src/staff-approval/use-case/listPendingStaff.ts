import type { StaffAccountRepositoryInterface } from '../domain/interface/staffAccountRepository.js';
import type { ApproverContextReaderInterface } from '../domain/interface/approverContextReader.js';
import { ApprovalForbiddenError, toView, type StaffAccountView } from '../domain/model/staffApproval.js';

/** 承認待ち一覧（slice-17 AC-4）。super admin のみ取得できる（他ロールは 403）。 */
export class ListPendingStaffUseCase {
  constructor(
    private readonly repo: StaffAccountRepositoryInterface,
    private readonly approver: ApproverContextReaderInterface,
  ) {}

  async execute(input: { userId: string }): Promise<{ pending: StaffAccountView[] }> {
    if (!(await this.approver.isSuperAdmin(input.userId))) throw new ApprovalForbiddenError();
    const pending = await this.repo.listPending();
    return { pending: pending.map(toView) };
  }
}
