import {
  ProjectEntity,
  IncidentStatusInvalidError,
  isIncidentStatus,
  type IncidentStatus,
} from '../domain/model/project.js';
import type { ProjectRepositoryInterface } from '../domain/interface/projectRepository.js';

/** 確定レスポンスの案件（snake_case）。オラクル server.mjs と HTTP 等価。 */
export interface LinkedProject {
  id: string;
  project_key: string;
  client_name: string | null;
  status: IncidentStatus;
}

/** 確定レスポンスのインシデント（案件へ紐づく）。 */
export interface LinkedIncident {
  project_id: string;
  status: IncidentStatus;
}

export interface LinkResult {
  projects: LinkedProject[];
  incidents: LinkedIncident[];
}

/**
 * 確定時の案件紐づけ（slice-11 AC-1〜4）。
 * 1) 先に全インシデント status を検証（列挙外は 422・**この時点で未 mutate**＝原子性・AC-4）。
 * 2) 検証通過後に案件キーで既存/新規を解決（`(user_id, project_key)` 一意・重複作成しない・AC-1/AC-3）し、
 *    INCIDENTS 状態を案件へ紐づけて保存する（PROJECT.status＝最新インシデント status）。
 */
export class LinkReportProjectsUseCase {
  constructor(
    private readonly repo: ProjectRepositoryInterface,
    private readonly generateId: () => string,
  ) {}

  async execute(input: { userId: string; projects: unknown }): Promise<LinkResult> {
    const list = Array.isArray(input.projects) ? (input.projects as Record<string, unknown>[]) : [];

    // 1) バリデーション（不正 incident status は 422）を保存より先に行う（部分適用なし）。
    for (const p of list) {
      const incidents = Array.isArray(p.incidents) ? (p.incidents as Record<string, unknown>[]) : [];
      for (const inc of incidents) {
        if (!isIncidentStatus(inc.status)) throw new IncidentStatusInvalidError(inc.status);
      }
    }

    // 2) 案件を解決（既存/新規）し、インシデントを紐づけて保存する。
    const projects: LinkedProject[] = [];
    const incidents: LinkedIncident[] = [];
    for (const p of list) {
      const projectKey = String(p.project_key ?? '');
      const clientName = typeof p.client_name === 'string' ? p.client_name : null;
      let project = await this.repo.findByUserAndKey(input.userId, projectKey);
      if (!project) {
        project = ProjectEntity.create({
          id: this.generateId(),
          userId: input.userId,
          projectKey,
          clientName,
          status: '発生',
        });
      }
      const incs = (Array.isArray(p.incidents) ? p.incidents : []) as { status: IncidentStatus }[];
      for (const inc of incs) incidents.push({ project_id: project.id, status: inc.status });
      const latest = incs.at(-1);
      if (latest) project.applyIncidentStatus(latest.status); // 最新 incident status を反映
      await this.repo.save(project);
      projects.push({
        id: project.id,
        project_key: project.projectKey,
        client_name: project.clientName,
        status: project.status,
      });
    }
    return { projects, incidents };
  }
}
