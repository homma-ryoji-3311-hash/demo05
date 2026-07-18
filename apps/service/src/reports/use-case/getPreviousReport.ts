import type { StructuredSummary } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import { ReportForbiddenError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/** 前回参照の読み取り結果（前回本文＋前回確定要約）。無ければ null。 */
export interface PreviousView {
  rawText: string;
  summary: StructuredSummary | null;
}

/**
 * 前回参照ユースケース（slice-05）。対象報告の「直近の確定報告」を読み取り専用で返す。
 * - 対象が存在しなければ 404（ReportNotFoundError）／他人の報告なら 403（ReportForbiddenError）。
 *   ＝オラクル reference-mock /previous と同じ認可境界（404 → 403 → 200 の順）。
 * - 前回が無ければ null（route/controller が 200＋previous:null に変換・404 にしない）。
 * 何も書き換えない（read-only）。
 */
export class GetPreviousReportUseCase {
  constructor(private readonly repo: ReportRepositoryInterface) {}

  async execute(input: { userId: string; id: string }): Promise<PreviousView | null> {
    const target = await this.repo.findById(input.id);
    if (!target) throw new ReportNotFoundError(input.id);
    if (target.userId !== input.userId) throw new ReportForbiddenError(input.id);

    const prev = await this.repo.findPreviousConfirmed(input.userId, input.id);
    if (!prev) return null;
    return { rawText: prev.rawText, summary: prev.toPersistence().confirmedSummary };
  }
}
