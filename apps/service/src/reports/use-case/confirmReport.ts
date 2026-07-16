import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { ReportConfirmedError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/**
 * 報告の確定ユースケース（slice-03 AC-1/AC-3）。
 * 編集後の要約を confirmed_summary として保存し、status を confirmed にする。
 * すでに確定済みなら二重確定として 409（AC-3）。確定後の本文更新（PATCH）は
 * UpdateDraftUseCase が同じ ReportConfirmedError で 409 にする（AC-2）。
 */
export class ConfirmReportUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string; summary: unknown }): Promise<ReportEntity> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.isConfirmed()) throw new ReportConfirmedError(input.id); // AC-3: 二重確定 → 409
    report.confirm(input.summary); // 形が崩れていれば ReportValidationError → 422
    await this.repo.save(report);
    return report;
  }
}
