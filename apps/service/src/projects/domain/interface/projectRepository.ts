import type { ProjectEntity } from '../model/project.js';

/**
 * 案件（PROJECTS）の保存・解決ポート（slice-11）。
 * 案件キーは同一ユーザー内で一意 `(user_id, project_key)`＝突合の決定性の土台（AC-3）。
 * 実装は infra/repository/（インメモリ／Prisma）。REPORT_PROJECTS/INCIDENTS の観測は確定レスポンスで返す。
 */
export interface ProjectRepositoryInterface {
  /** `(user_id, project_key)` で案件を解決（無ければ null）。 */
  findByUserAndKey(userId: string, projectKey: string): Promise<ProjectEntity | null>;
  save(project: ProjectEntity): Promise<void>;
}
