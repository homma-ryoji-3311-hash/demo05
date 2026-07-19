import {
  OpportunityNotFoundError,
  ReportStatusForbiddenError,
  type OpportunityView,
} from '../domain/model/opportunity.js';
import type { ReportStatusRepositoryInterface } from '../domain/interface/reportStatusRepository.js';
import type { ActorContextReaderInterface } from '../domain/interface/actorContextReader.js';

/**
 * 報告漏れを計上（slice-15 AC-4）。manager のみ（本人は 403・read-only）。未報告→報告漏れは自動でなく明示操作。
 */
export class FlagMissingUseCase {
  constructor(
    private readonly repo: ReportStatusRepositoryInterface,
    private readonly actor: ActorContextReaderInterface,
  ) {}

  async execute(input: { userId: string; opportunityId: string }): Promise<OpportunityView> {
    if (!(await this.actor.isManager(input.userId))) throw new ReportStatusForbiddenError();
    const opp = await this.repo.findOpportunityById(input.opportunityId);
    if (!opp) throw new OpportunityNotFoundError(input.opportunityId);
    opp.flagMissing();
    await this.repo.saveOpportunity(opp);
    return opp.toView();
  }
}

/**
 * 欠勤を承認（slice-15 AC-5）。manager のみ（本人は 403）。消去でなくステータスとして残す（評価対象外）。
 */
export class ApproveAbsenceUseCase {
  constructor(
    private readonly repo: ReportStatusRepositoryInterface,
    private readonly actor: ActorContextReaderInterface,
  ) {}

  async execute(input: { userId: string; opportunityId: string }): Promise<OpportunityView> {
    if (!(await this.actor.isManager(input.userId))) throw new ReportStatusForbiddenError();
    const opp = await this.repo.findOpportunityById(input.opportunityId);
    if (!opp) throw new OpportunityNotFoundError(input.opportunityId);
    opp.approveAbsence();
    await this.repo.saveOpportunity(opp);
    return opp.toView();
  }
}
