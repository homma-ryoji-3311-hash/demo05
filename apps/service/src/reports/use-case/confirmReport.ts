import type { ReportEntity } from '../domain/model/report.js';
import type { ReportRepositoryInterface } from '../domain/interface/reportRepository.js';
import type { ProjectLinkerInterface, LinkedProject, LinkedIncident } from '../domain/interface/projectLinker.js';
import type { MasterReconcilerInterface, MasterSummaryView } from '../domain/interface/masterReconciler.js';
import { ReportConfirmedError, ReportForbiddenError, ReportNotFoundError } from '../domain/error/reportErrors.js';

/** 確定の結果（slice-03 report ＋ slice-11 案件/インシデント ＋ slice-12 突合済みマスター）。 */
export interface ConfirmResult {
  report: ReportEntity;
  projects: LinkedProject[];
  incidents: LinkedIncident[];
  masterSummaries: MasterSummaryView[];
}

/**
 * 報告の確定ユースケース（slice-03 ＋ slice-11 紐づけ ＋ slice-12 突合）。
 * 順序: 404/403/409（read）→ 案件紐づけ（不正 incident status は confirm 前に 422＝原子性・slice-11 AC-4）
 *       → confirm（mutate）→ **突合（確定に同期・master 側にのみ upsert・slice-12 AC-5）**。
 * projectLinker / masterReconciler 未注入時は従来どおり（projects/incidents/masterSummaries は空）＝slice-03 の挙動は不変。
 */
export class ConfirmReportUseCase {
  constructor(
    private readonly repo: ReportRepositoryInterface,
    private readonly projectLinker?: ProjectLinkerInterface,
    private readonly masterReconciler?: MasterReconcilerInterface,
  ) {}

  async execute(input: { userId: string; id: string; summary: unknown; projects?: unknown }): Promise<ConfirmResult> {
    const report = await this.repo.findById(input.id);
    if (!report) throw new ReportNotFoundError(input.id);
    if (report.userId !== input.userId) throw new ReportForbiddenError(input.id); // 他人の報告は確定させない（403）
    if (report.isConfirmed()) throw new ReportConfirmedError(input.id); // AC-3: 二重確定 → 409

    // slice-11: 案件紐づけ（不正 incident status は confirm する前に 422＝原子性）。
    const linked = this.projectLinker
      ? await this.projectLinker.link({ userId: input.userId, projects: input.projects })
      : { projects: [], incidents: [] };

    report.confirm(input.summary); // 形が崩れていれば ReportValidationError → 422
    await this.repo.save(report);

    // slice-12: 突合（確定に同期）。紐づけ結果の project_id と、リクエストの incident（key つき）を
    // **位置で対応づける**（linker は input.projects を順に処理し linked.projects に push するため index が一致）。
    // 案件キーの find だと同一 project_key が複数あるとき取り違えるため index 対応にする。master 側にのみ upsert
    // し、report は書き換えない（AC-3）。
    const inputProjects = Array.isArray(input.projects) ? (input.projects as Record<string, unknown>[]) : [];
    const masterSummaries = this.masterReconciler
      ? await this.masterReconciler.reconcile({
          userId: input.userId,
          reportDate: report.reportDate,
          projects: linked.projects.map((lp, i) => ({
            project_id: lp.id,
            incidents: incidentsOf(inputProjects[i]),
          })),
        })
      : [];

    return { report, projects: linked.projects, incidents: linked.incidents, masterSummaries };
  }
}

/** 確定リクエストの1案件から incidents（key つき）を取り出す。 */
function incidentsOf(project: Record<string, unknown> | undefined): { key?: string; status: string }[] {
  return Array.isArray(project?.incidents) ? (project.incidents as { key?: string; status: string }[]) : [];
}
