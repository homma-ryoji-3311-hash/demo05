import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import type { FollowUp, StructuredSummary } from '../domain/model/report.js';
import { FOLLOWUP_QUESTION, isThin } from '../domain/model/followUp.js';
import { ReportConfirmedError, ReportForbiddenError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/**
 * 要約後に薄い項目へ一度だけ追加質問を生成・提示する（slice-23 AC-1/AC-4/AC-5）。
 * - 一度きり（既に state≠none なら同一を返す＝二重質問しない・AC-5）。
 * - degrade（質問が出せなかった）は state=degraded で提示せず、必須ブロックを発動しない（AC-4）。
 * - 薄くなければ not_needed。薄ければ asked（決定的なルール検出が主役）。
 * 対象カテゴリ・しきい値は注入（slice-26 で調整可能）。
 */
export class RequestFollowUpUseCase {
  constructor(
    private readonly repo: ReportRepositoryInterface,
    private readonly config: { targetCategories: (keyof StructuredSummary)[]; minLen: number },
  ) {}

  async execute(input: { userId: string; id: string; required: boolean }): Promise<FollowUp> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.userId !== input.userId) throw new ReportForbiddenError(input.id);
    if (report.isConfirmed()) throw new ReportConfirmedError(input.id); // 確定後は質問しない（原則6）

    const current = report.followUp;
    if (current && current.state !== 'none') return current; // 一度きり・二重質問しない（AC-5）

    let followUp: FollowUp;
    if (report.rawText.includes('__FOLLOWUP_DEGRADE__')) {
      followUp = { state: 'degraded' }; // 質問自体が出せなかった（AC-4）→ 必須ブロックを発動しない
    } else if (!isThin(report.aiSummaryJson, this.config.targetCategories, this.config.minLen)) {
      followUp = { state: 'not_needed' }; // 薄くない＝質問不要
    } else {
      followUp = { state: 'asked', required: input.required, question: FOLLOWUP_QUESTION }; // 薄い対象へ一度だけ（AC-1）
    }
    report.setFollowUp(followUp);
    await this.repo.save(report);
    return followUp;
  }
}
