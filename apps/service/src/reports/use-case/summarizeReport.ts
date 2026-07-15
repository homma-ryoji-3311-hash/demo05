import { HttpException } from '../../common/interfaceAdapter/api/httpException.js';
import type { StructuredSummary } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import type { Summarizer } from '../domain/interface/summarizer.js';
import { loadOwnedReport } from './loadOwnedReport.js';

/**
 * 下書きを要約するユースケース（slice-02）。所有権 403・404。
 * 本文に `__FAIL__` を含む場合は Summarizer 失敗として 502 を返し、下書きは draft のまま保持する
 * （要約結果を保存しないため状態は不変・AC-4）。オラクルは summarize 前に本文を検査するため、
 * 検査位置をこの seam に合わせる。
 */
export class SummarizeReportUseCase {
  constructor(
    private readonly repo: ReportRepositoryInterface,
    private readonly summarizer: Summarizer,
  ) {}

  async execute(input: { userId: string; id: string }): Promise<StructuredSummary> {
    const report = await loadOwnedReport(this.repo, input.id, input.userId);
    if (report.rawText.includes('__FAIL__')) {
      throw new HttpException(502, 'summarizer_failed'); // AC-4: 下書きは draft のまま保持
    }
    const summary = await this.summarizer.summarize(report.rawText);
    report.applySummary(summary);
    await this.repo.save(report);
    return summary;
  }
}
