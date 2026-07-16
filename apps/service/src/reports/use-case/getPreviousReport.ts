import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { ReportNotFoundError } from '../domain/error/reportErrors.js';

/**
 * 前回参照（slice-05）。参照元の報告（:id）から見た直近の確定報告を読み取り専用で返す。
 * 前回が無いのは正常系＝null を返す（404 にしない・AC-2）。404 は参照元の報告が無いときだけ。
 * 参照元自身は候補から除く（確定済み報告の previous がそれ自身にならないように）。
 * 所有権による拒否（他人の報告 → 403）は slice-04/06 の領分。ここでは存在判定のみ。
 */
export class GetPreviousReportUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string }): Promise<ReportEntity | null> {
    const current = await this.repo.findById(input.id);
    if (!current) throw new ReportNotFoundError(input.id);
    return this.repo.findLastConfirmedByUser(input.userId, input.id);
  }
}
