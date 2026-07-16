import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';

/**
 * 自分の報告一覧（slice-04 AC-1）。日付の新しい順。
 * 所有者の絞り込みはリポジトリのクエリで行う＝全件を読んでから捨てない
 * （他人の報告をメモリに載せないので、絞り忘れが情報漏洩にならない）。
 */
export class ListReportsUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string }): Promise<ReportEntity[]> {
    return this.repo.findAllByUser(input.userId);
  }
}
