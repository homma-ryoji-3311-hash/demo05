import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { ReportNotFoundError } from '../domain/error/reportErrors.js';

/**
 * 報告を1件取得する（slice-02 AC-4 の「502 でも draft のまま」を検証する GET /reports/:id が使う）。
 * 所有権による拒否（他人の報告 → 403）は slice-04/06 の領分。ここでは存在判定のみ（無ければ 404）。
 */
export class GetReportUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string }): Promise<ReportEntity> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    return report;
  }
}
