import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';

/** ユーザーの現在の下書きを取得する（S3 の下書き復元）。無ければ null。 */
export class GetDraftUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string }): Promise<ReportEntity | null> {
    return this.repo.findDraftByUser(input.userId);
  }
}
