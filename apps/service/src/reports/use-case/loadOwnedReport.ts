import { HttpException } from '../../common/interfaceAdapter/api/httpException.js';
import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';

/**
 * 対象報告を所有権つきで読み出す共通ヘルパ（オラクルの 404→403 の順序を踏襲）。
 * 無ければ 404、他人所有なら 403 を HttpException で throw する（共通 error-handler が変換）。
 */
export async function loadOwnedReport(
  repo: ReportRepositoryInterface,
  id: string,
  userId: string,
): Promise<ReportEntity> {
  const report = await repo.findById(id);
  if (!report) throw new HttpException(404, 'not_found');
  if (report.userId !== userId) throw new HttpException(403, 'forbidden');
  return report;
}
