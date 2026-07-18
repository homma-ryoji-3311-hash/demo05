import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { ReportForbiddenError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/**
 * 所有者境界を強制して報告を1件読む（slice-04 AC-2/AC-3）。
 * 詳細取得の唯一の入口。**所有者チェックをここ1か所に集約する**ので、
 * 呼び出し側（controller）は所有権を意識しない＝チェックの付け忘れが起きない。
 * 他人の報告は 403（内容は一切返さない）。存在しない報告は 404。
 */
export class LoadOwnedReportUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string }): Promise<ReportEntity> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.userId !== input.userId) throw new ReportForbiddenError(input.id); // AC-3: 他人 → 403
    return report;
  }
}
