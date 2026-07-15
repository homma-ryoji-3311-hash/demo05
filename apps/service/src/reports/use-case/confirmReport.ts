import type { ReportEntity, StructuredSummary } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import type { Summarizer } from '../domain/interface/summarizer.js';
import { ReportConfirmedError } from '../domain/error/reportErrors.js';
import { loadOwnedReport } from './loadOwnedReport.js';

/**
 * 報告を確定するユースケース（slice-03）。所有権 403・404、二重確定 409。
 * confirmed_summary は body.summary ?? aiSummaryJson ?? （フォールバックで要約）の順で決める
 * （オラクルと同一）。確定後は status=confirmed となり不変（本文更新は slice-01 の 409 に委ねる）。
 */
export class ConfirmReportUseCase {
  constructor(
    private readonly repo: ReportRepositoryInterface,
    private readonly summarizer: Summarizer,
  ) {}

  async execute(input: { userId: string; id: string; summary?: StructuredSummary }): Promise<ReportEntity> {
    const report = await loadOwnedReport(this.repo, input.id, input.userId);
    if (report.isConfirmed()) throw new ReportConfirmedError(input.id); // AC-3: 二重確定 → 409
    const summary = input.summary ?? report.aiSummaryJson ?? (await this.summarizer.summarize(report.rawText));
    report.confirm(summary);
    await this.repo.save(report);
    return report;
  }
}
