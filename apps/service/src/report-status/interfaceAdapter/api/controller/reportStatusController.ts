import type { SetReportCycleUseCase, GetReportCycleUseCase } from '../../../use-case/setReportCycle.js';
import type { ViewMyReportStatusUseCase } from '../../../use-case/viewMyReportStatus.js';
import type { FlagMissingUseCase, ApproveAbsenceUseCase } from '../../../use-case/mutateReportStatus.js';
import type { ReportCycleView } from '../../../domain/model/reportCycle.js';
import type { OpportunityView } from '../../../domain/model/opportunity.js';

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-15 報告サイクル・履行状況）。
 * 未認証 401 は route の authUserId、manager 認可 403・不正サイクル 422 は use-case/ドメインが担う。
 */
export class ReportStatusController {
  constructor(
    private readonly setCycle: SetReportCycleUseCase,
    private readonly getCycle: GetReportCycleUseCase,
    private readonly viewMy: ViewMyReportStatusUseCase,
    private readonly flag: FlagMissingUseCase,
    private readonly approve: ApproveAbsenceUseCase,
  ) {}

  async putCycle(userId: string, staffId: string, body: unknown): Promise<{ status: number; body: ReportCycleView }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const view = await this.setCycle.execute({ userId, staffId, cycle: b.cycle, deadlineLocal: b.deadline_local });
    return { status: 200, body: view };
  }

  async getCycleById(
    userId: string,
    staffId: string,
  ): Promise<{ status: number; body: ReportCycleView | { error: string } }> {
    const view = await this.getCycle.execute({ userId, staffId });
    return view ? { status: 200, body: view } : { status: 404, body: { error: 'not_found' } };
  }

  async myStatus(userId: string): Promise<{ status: number; body: { opportunities: OpportunityView[] } }> {
    const view = await this.viewMy.execute({ userId });
    return { status: 200, body: view };
  }

  async flagMissing(userId: string, oppId: string): Promise<{ status: number; body: OpportunityView }> {
    const view = await this.flag.execute({ userId, opportunityId: oppId });
    return { status: 200, body: view };
  }

  async approveAbsence(userId: string, oppId: string): Promise<{ status: number; body: OpportunityView }> {
    const view = await this.approve.execute({ userId, opportunityId: oppId });
    return { status: 200, body: view };
  }
}
