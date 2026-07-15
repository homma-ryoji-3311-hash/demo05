import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { loadOwnedReport } from './loadOwnedReport.js';

/**
 * 前回の確定報告を参照するユースケース（slice-05）。対象(:id)の所有権を検証（404/403）した上で、
 * 自分の直近の確定報告（:id 以外）を返す。無ければ null（呼び出し側で previous: null に変換）。
 */
export class GetPreviousReportUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string }): Promise<ReportEntity | null> {
    await loadOwnedReport(this.repo, input.id, input.userId); // 対象の 404/403 を先に確定させる
    return this.repo.findLatestConfirmedByUser(input.userId, input.id);
  }
}
