import type { MasterSummaryEntity } from '../model/masterSummary.js';

/**
 * 突合済みマスター（MASTER_SUMMARIES）の保存・取得ポート（slice-12）。
 * `(user_id, project_id, period)` で一意＝upsert は重複行を作らない（冪等・AC-4）。
 * 実装は infra/repository/（インメモリ／Prisma）。
 */
export interface MasterSummaryRepositoryInterface {
  /** `(user_id, project_id, period)` の既存行（無ければ null）。増分マージの土台。 */
  find(userId: string, projectId: string, period: string): Promise<MasterSummaryEntity | null>;
  /** `(user_id, project_id, period)` で upsert（重複行を作らず上書き）。 */
  upsert(summary: MasterSummaryEntity): Promise<void>;
}
