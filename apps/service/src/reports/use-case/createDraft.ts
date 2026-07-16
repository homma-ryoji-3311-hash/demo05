import { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';

/** 下書き作成ユースケース（slice-01 AC-1/AC-4）。report_date 検証はドメインモデルが行う（→ 422）。 */
export class CreateDraftUseCase {
  constructor(
    private readonly repo: ReportRepositoryInterface,
    private readonly generateId: () => string,
  ) {}

  async execute(input: { userId: string; reportDate: unknown; rawText?: unknown }): Promise<ReportEntity> {
    const report = ReportEntity.createDraft({
      id: this.generateId(),
      userId: input.userId,
      reportDate: input.reportDate,
      rawText: input.rawText,
    });
    await this.repo.save(report);
    return report;
  }
}
