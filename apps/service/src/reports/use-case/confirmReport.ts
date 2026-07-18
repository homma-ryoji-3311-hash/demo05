import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import type { ProjectLinkerInterface, LinkedProject, LinkedIncident } from '../domain/interface/projectLinker.js';
import { ReportConfirmedError, ReportForbiddenError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/** 確定の結果（slice-03 の report ＋ slice-11 の紐づいた案件・インシデント）。 */
export interface ConfirmResult {
  report: ReportEntity;
  projects: LinkedProject[];
  incidents: LinkedIncident[];
}

/**
 * 報告の確定ユースケース（slice-03 AC-1/AC-3 ＋ slice-11 案件紐づけ）。
 * 編集後の要約を confirmed_summary として保存し、status を confirmed にする。
 * すでに確定済みなら二重確定として 409（AC-3）。確定後の本文更新（PATCH）は
 * UpdateDraftUseCase が同じ ReportConfirmedError で 409 にする（AC-2）。
 *
 * slice-11: `projects` を案件キーで既存/新規に紐づけ、INCIDENTS 状態を保存する（projectLinker 経由）。
 * **不正な incident status（422）は report を confirm する前に検証する＝原子性**（AC-4）:
 * 順序は 404/403/409（read）→ 案件紐づけ（不正 status は保存前に 422）→ confirm（mutate）。
 * projectLinker 未注入時は従来どおり（projects/incidents は空）＝slice-03 の挙動は不変。
 */
export class ConfirmReportUseCase {
  constructor(
    private readonly repo: ReportRepositoryInterface,
    private readonly projectLinker?: ProjectLinkerInterface,
  ) {}

  async execute(input: { userId: string; id: string; summary: unknown; projects?: unknown }): Promise<ConfirmResult> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.userId !== input.userId) throw new ReportForbiddenError(input.id); // 他人の報告は確定させない（403）
    if (report.isConfirmed()) throw new ReportConfirmedError(input.id); // AC-3: 二重確定 → 409

    // slice-11: 案件紐づけ（不正 incident status は confirm する前に 422＝原子性・AC-4）。
    const linked = this.projectLinker
      ? await this.projectLinker.link({ userId: input.userId, projects: input.projects })
      : { projects: [], incidents: [] };

    report.confirm(input.summary); // 形が崩れていれば ReportValidationError → 422
    await this.repo.save(report);
    return { report, projects: linked.projects, incidents: linked.incidents };
  }
}
