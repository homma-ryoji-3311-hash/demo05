import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import type { SummarizerInterface } from '../domain/interface/summarizer.js';
import type { StructuredSummary } from '../domain/model/report.js';
import { applySoftAnswersToSummary } from '../domain/model/softAnswers.js';
import { FollowUpStateError } from '../domain/model/followUp.js';
import {
  ReportConfirmedError,
  ReportForbiddenError,
  ReportNotFoundError,
  SummarizerFailedError,
} from '../domain/error/reportErrors.js';

/**
 * 追加質問への回答を本文へ追記し、要約を作り直す（slice-23 AC-2・下書きのまま・確定済みは変えない）。
 * 提示済み（asked）でなければ 422・空回答は 422。回答後は state=answered（必須ブロック解除・AC-3）。
 */
export class AnswerFollowUpUseCase {
  constructor(
    private readonly repo: ReportRepositoryInterface,
    private readonly summarizer: SummarizerInterface,
  ) {}

  async execute(input: {
    userId: string;
    id: string;
    answer: unknown;
  }): Promise<{ id: string; status: string; raw_text: string; ai_summary_json: StructuredSummary | null }> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.userId !== input.userId) throw new ReportForbiddenError(input.id);
    if (report.isConfirmed()) throw new ReportConfirmedError(input.id); // 確定済みは不変（原則6）

    const followUp = report.followUp;
    if (followUp?.state !== 'asked') throw new FollowUpStateError('no_pending_follow_up'); // 提示前は回答できない
    if (typeof input.answer !== 'string' || input.answer.length === 0) throw new FollowUpStateError('answer');

    report.updateRawText(`${report.rawText}\n${input.answer}`); // 回答は raw_text へ追記（確定前のみ）
    let summary: StructuredSummary;
    try {
      summary = await this.summarizer.summarize(report.rawText); // 本文追記後に要約を作り直す
    } catch (cause) {
      throw new SummarizerFailedError(input.id, { cause });
    }
    report.applySummary(applySoftAnswersToSummary(summary, report.softAnswers)); // slice-20 と一貫（雑感は除外のまま）
    report.setFollowUp({ ...followUp, state: 'answered' });
    await this.repo.save(report);
    return { id: report.id, status: report.status, raw_text: report.rawText, ai_summary_json: report.aiSummaryJson };
  }
}
