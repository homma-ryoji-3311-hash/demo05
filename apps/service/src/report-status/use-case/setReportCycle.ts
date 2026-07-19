import { ReportCycle, type ReportCycleView } from '../domain/model/reportCycle.js';
import { ReportStatusForbiddenError } from '../domain/model/opportunity.js';
import type { ReportStatusRepositoryInterface } from '../domain/interface/reportStatusRepository.js';
import type { ActorContextReaderInterface } from '../domain/interface/actorContextReader.js';

/**
 * スタッフの報告サイクルを設定する（slice-15 AC-1）。manager のみ（staff は 403）。不正なサイクルは 422（ドメイン）。
 */
export class SetReportCycleUseCase {
  constructor(
    private readonly repo: ReportStatusRepositoryInterface,
    private readonly actor: ActorContextReaderInterface,
  ) {}

  async execute(input: {
    userId: string;
    staffId: string;
    cycle: unknown;
    deadlineLocal: unknown;
  }): Promise<ReportCycleView> {
    if (!(await this.actor.isManager(input.userId))) throw new ReportStatusForbiddenError();
    const cycle = ReportCycle.create({
      staffId: input.staffId,
      cycle: input.cycle,
      deadlineLocal: input.deadlineLocal,
    });
    await this.repo.saveCycle(cycle);
    return cycle.toView();
  }
}

/** サイクル取得（manager のみ・無ければ null）。 */
export class GetReportCycleUseCase {
  constructor(
    private readonly repo: ReportStatusRepositoryInterface,
    private readonly actor: ActorContextReaderInterface,
  ) {}

  async execute(input: { userId: string; staffId: string }): Promise<ReportCycleView | null> {
    if (!(await this.actor.isManager(input.userId))) throw new ReportStatusForbiddenError();
    const cycle = await this.repo.findCycleByStaff(input.staffId);
    return cycle ? cycle.toView() : null;
  }
}
