import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { loadOwnedReport } from './loadOwnedReport.js';

/** 報告詳細を取得するユースケース（slice-04 AC-2/AC-3）。無ければ 404、他人所有は 403。 */
export class GetReportUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string }): Promise<ReportEntity> {
    return loadOwnedReport(this.repo, input.id, input.userId);
  }
}
