import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { parseSoftAnswers } from '../domain/model/softAnswers.js';
import { ReportForbiddenError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/**
 * ソフト設問回答を保存する（slice-20・本人のみ）。
 * レスポンスには雑感・スコアを一切出さない（保存できたことだけ返す・AC-2/AC-4）。
 */
export class SaveSoftAnswersUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string; body: unknown }): Promise<{ id: string; saved: true }> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.userId !== input.userId) throw new ReportForbiddenError(input.id); // 他人の報告には保存できない
    report.setSoftAnswers(parseSoftAnswers(input.body));
    await this.repo.save(report);
    return { id: report.id, saved: true };
  }
}
