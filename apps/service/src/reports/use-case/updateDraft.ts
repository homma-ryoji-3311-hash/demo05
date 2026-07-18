import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { ReportConfirmedError, ReportForbiddenError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/**
 * 下書き本文の更新ユースケース（slice-01 AC-2/AC-3）。
 * 他人の報告は書き換えられない（slice-06 AC-4）。所有権を確定後不変より先に判定するので、
 * 他人の確定済み報告は 409 ではなく 403 で塞ぐ（存在は 404 が先・情報を漏らさない順序）。
 * 詳細 GET の所有権は LoadOwnedReportUseCase が担い、書き込み側（PATCH）はここが担う。
 */
export class UpdateDraftUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string; rawText?: unknown }): Promise<ReportEntity> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.userId !== input.userId) throw new ReportForbiddenError(input.id); // AC-4: 他人の報告 → 403
    if (report.isConfirmed()) throw new ReportConfirmedError(input.id); // AC-3: 確定後不変 → 409
    if (typeof input.rawText === 'string') report.updateRawText(input.rawText);
    await this.repo.save(report);
    return report;
  }
}
