import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { ReportConfirmedError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/** 下書き本文の更新ユースケース（slice-01 AC-2/AC-3）。確定済みは不変（→ 409）。 */
export class UpdateDraftUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string; rawText?: unknown }): Promise<ReportEntity> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.isConfirmed()) throw new ReportConfirmedError(input.id); // AC-3: 確定後不変 → 409
    if (typeof input.rawText === 'string') report.updateRawText(input.rawText);
    await this.repo.save(report);
    return report;
  }
}
