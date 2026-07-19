import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import type { ZakkanViewerPolicyInterface } from '../domain/interface/zakkanViewerPolicy.js';
import { ReportForbiddenError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/**
 * 雑感（zakkan）の閲覧（slice-20 AC-3）。最小ロール（本人・担当 manager・メンタルケア担当）のみ。
 * private は本人のみ・限定は最小ロール・それ以外は 403。スコア・診断は返さない（AC-4）。
 */
export class ViewZakkanUseCase {
  constructor(
    private readonly repo: ReportRepositoryInterface,
    private readonly policy: ZakkanViewerPolicyInterface,
  ) {}

  async execute(input: {
    viewerId: string;
    id: string;
  }): Promise<{ zakkan: string | null; visibility: 'limited' | 'private' }> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    const soft = report.softAnswers;
    const visibility = soft?.zakkan_visibility ?? 'limited';
    const isOwner = report.userId === input.viewerId;
    const minRole = await this.policy.canViewLimited(input.viewerId, report.userId);
    const canView = isOwner || (visibility !== 'private' && minRole); // private は本人のみ・限定は最小ロール
    if (!canView) throw new ReportForbiddenError(input.id);
    return { zakkan: soft?.zakkan ?? null, visibility };
  }
}
