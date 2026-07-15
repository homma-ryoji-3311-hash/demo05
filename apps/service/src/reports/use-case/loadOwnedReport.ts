import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { ReportForbiddenError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/**
 * 対象報告を所有権つきで読み出す共通ヘルパ（オラクルの 404→403 の順序を踏襲）。
 * 無ければ ReportNotFoundError（→404）、他人所有なら ReportForbiddenError（→403）を throw する
 * （HTTP への変換は共通 error-handler が kind を見て行う。use-case は HTTP を知らない）。
 */
export async function loadOwnedReport(
  repo: ReportRepositoryInterface,
  id: string,
  userId: string,
): Promise<ReportEntity> {
  const report = await repo.findById(id);
  if (!report) throw new ReportNotFoundError(id);
  if (report.userId !== userId) throw new ReportForbiddenError(id);
  return report;
}
