import { MasterSummaryEntity, type MasterSummaryProps } from '../../domain/model/masterSummary.js';
import type { MasterSummaryRepositoryInterface } from '../../domain/interface/masterSummaryRepository.js';

/**
 * インメモリ実装（テストダブル）。MasterSummaryRepositoryInterface を満たす本物の実装で、
 * DB なしで突合フローを検証できる（受け入れテストの緑検証・PERSISTENCE=memory）。
 * `(user_id, project_id, period)` を複合キーにして upsert（重複行を作らない・AC-4）。
 * 本番は PrismaMasterSummaryRepository。マイグレーションの実行は統合役（CLAUDE.md §1-2）。
 */
export class InMemoryMasterSummaryRepository implements MasterSummaryRepositoryInterface {
  private readonly records = new Map<string, MasterSummaryProps>();

  private key(userId: string, projectId: string, period: string): string {
    return `${userId}|${projectId}|${period}`;
  }

  async find(userId: string, projectId: string, period: string): Promise<MasterSummaryEntity | null> {
    const r = this.records.get(this.key(userId, projectId, period));
    return r ? MasterSummaryEntity.reconstruct(r) : null;
  }

  async upsert(summary: MasterSummaryEntity): Promise<void> {
    const p = summary.toPersistence();
    this.records.set(this.key(p.userId, p.projectId, p.period), p); // 同一キーは上書き＝重複しない
  }
}
