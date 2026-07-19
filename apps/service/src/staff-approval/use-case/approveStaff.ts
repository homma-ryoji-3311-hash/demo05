import type { StaffAccountRepositoryInterface } from '../domain/interface/staffAccountRepository.js';
import type { ApproverContextReaderInterface } from '../domain/interface/approverContextReader.js';
import {
  ApprovalForbiddenError,
  StaffAccountNotFoundError,
  approveAccount,
  toView,
  type StaffAccountView,
} from '../domain/model/staffApproval.js';

/**
 * 承認（slice-17 AC-2/AC-3）。super admin のみ（403）→ 対象確認（404）→ 担当ロール検証（422）→ active 化＋属性保存。
 * 判定順はオラクルと同一（forbidden → not_found → validation）。
 */
export class ApproveStaffUseCase {
  constructor(
    private readonly repo: StaffAccountRepositoryInterface,
    private readonly approver: ApproverContextReaderInterface,
  ) {}

  async execute(input: {
    approverId: string;
    staffId: string;
    assignmentRole: unknown;
    channel: unknown;
    cycle: unknown;
  }): Promise<StaffAccountView> {
    if (!(await this.approver.isSuperAdmin(input.approverId))) throw new ApprovalForbiddenError();
    const account = await this.repo.findById(input.staffId);
    if (!account) throw new StaffAccountNotFoundError(input.staffId);
    const approved = approveAccount(account, {
      assignmentRole: input.assignmentRole,
      channel: input.channel,
      cycle: input.cycle,
    });
    await this.repo.save(approved);
    return toView(approved);
  }
}
