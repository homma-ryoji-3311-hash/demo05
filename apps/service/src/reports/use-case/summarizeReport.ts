import type { StructuredSummary } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import type { SummarizerInterface } from '../domain/interface/summarizer.js';
import { applySoftAnswersToSummary } from '../domain/model/softAnswers.js';
import { ReportForbiddenError, ReportNotFoundError, SummarizerFailedError } from '../domain/error/reportErrors.js';

/**
 * 要約ユースケース（slice-02 AC-1〜AC-4）。
 * 要約は必ず抽象化層（SummarizerInterface）経由で行う。プロバイダを直接呼ばない（指示書 §4 の枠）。
 * 失敗時は SummarizerFailedError（kind=external → 502）を投げる。**保存の前に投げる**ので
 * 報告は一切変更されず draft のまま残る（AC-4）。
 */
export class SummarizeReportUseCase {
  constructor(
    private readonly repo: ReportRepositoryInterface,
    private readonly summarizer: SummarizerInterface,
  ) {}

  async execute(input: { userId: string; id: string }): Promise<StructuredSummary> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.userId !== input.userId) throw new ReportForbiddenError(input.id); // 他人の報告は要約させない（403・AC-4 と同じ認可境界）

    let summary: StructuredSummary;
    try {
      summary = await this.summarizer.summarize(report.rawText);
    } catch (cause) {
      throw new SummarizerFailedError(input.id, { cause });
    }

    // slice-20: ソフト設問を反映（AI活用→スキル）。雑感は Summarizer へ渡さず出力にも出さない・スコア化なし。
    // soft_answers が無ければ summary は不変（既存 slice-02 の挙動を壊さない）。
    const withSoft = applySoftAnswersToSummary(summary, report.softAnswers);
    report.applySummary(withSoft);
    await this.repo.save(report);
    return withSoft;
  }
}
