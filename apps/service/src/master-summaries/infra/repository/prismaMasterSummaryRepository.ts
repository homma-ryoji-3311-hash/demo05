import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import {
  MasterSummaryPersistenceUnavailableError,
  type MasterSummaryEntity,
} from '../../domain/model/masterSummary.js';
import type { MasterSummaryRepositoryInterface } from '../../domain/interface/masterSummaryRepository.js';

/**
 * 本番の Prisma 実装（slice-12 スコープ）。
 * schema.prisma への MASTER_SUMMARIES モデル追加とマイグレーションの実行は統合役（CLAUDE.md §1-2・層境ゲート）。
 * 本スライスではスキーマ変更・マイグレーションが禁止のため未配線（ドメインエラーで明示）。
 * ローカル/CI の緑検証は InMemoryMasterSummaryRepository（PERSISTENCE=memory）で行う。
 */
export class PrismaMasterSummaryRepository implements MasterSummaryRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async find(_userId: string, _projectId: string, _period: string): Promise<MasterSummaryEntity | null> {
    void this.prisma;
    throw new MasterSummaryPersistenceUnavailableError('find');
  }

  async upsert(_summary: MasterSummaryEntity): Promise<void> {
    void this.prisma;
    throw new MasterSummaryPersistenceUnavailableError('upsert');
  }
}
