import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';

/** 自分の報告一覧を取得するユースケース（slice-04 AC-1）。report_date 降順はリポジトリが保証する。 */
export class ListReportsUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string }): Promise<ReportEntity[]> {
    return this.repo.findByUser(input.userId);
  }
}
