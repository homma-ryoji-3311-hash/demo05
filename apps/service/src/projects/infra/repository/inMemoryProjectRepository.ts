import { ProjectEntity, type ProjectProps } from '../../domain/model/project.js';
import type { ProjectRepositoryInterface } from '../../domain/interface/projectRepository.js';

/**
 * インメモリ実装（テストダブル）。ProjectRepositoryInterface を満たす本物の実装で、
 * DB なしで案件紐づけフローを検証できる（受け入れテストの緑検証・PERSISTENCE=memory）。
 * 本番は PrismaProjectRepository。マイグレーションの実行は統合役（CLAUDE.md §1-2）。
 */
export class InMemoryProjectRepository implements ProjectRepositoryInterface {
  private readonly records = new Map<string, ProjectProps>();

  async findByUserAndKey(userId: string, projectKey: string): Promise<ProjectEntity | null> {
    for (const p of this.records.values()) {
      if (p.userId === userId && p.projectKey === projectKey) return ProjectEntity.reconstruct(p);
    }
    return null;
  }

  async save(project: ProjectEntity): Promise<void> {
    this.records.set(project.id, project.toPersistence());
  }
}

/**
 * dev/受け入れ用のシード（合成データのみ）。オラクル(tools/reference-mock-server/server.mjs:p_seed)と同一。
 * staff01 の既存案件（AC-1「既存案件へ案件キーで紐づく」の対象）。
 */
export function seedProjects(repo: InMemoryProjectRepository): void {
  void repo.save(
    ProjectEntity.reconstruct({
      id: 'p_seed',
      userId: 'staff01',
      projectKey: 'PJ-SEED-001',
      clientName: '得意先シード',
      status: '発生',
    }),
  );
}
