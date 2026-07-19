import type { OpportunityView } from '../domain/model/opportunity.js';
import type { ReportStatusRepositoryInterface } from '../domain/interface/reportStatusRepository.js';

/**
 * 本人の履行状況（5 ステータス）を read-only で返す（slice-15 AC-6）。
 * 認可: userId は authUserId（route）が担保。本人の機会のみ（他人は対象にできない）。
 */
export class ViewMyReportStatusUseCase {
  constructor(private readonly repo: ReportStatusRepositoryInterface) {}

  async execute(input: { userId: string }): Promise<{ opportunities: OpportunityView[] }> {
    const opps = await this.repo.findOpportunitiesByStaff(input.userId);
    return { opportunities: opps.map((o) => o.toView()) };
  }
}
