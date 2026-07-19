import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import { ReportStatusPersistenceUnavailableError, type Opportunity } from '../../domain/model/opportunity.js';
import type { ReportCycle } from '../../domain/model/reportCycle.js';
import type { ReportStatusRepositoryInterface } from '../../domain/interface/reportStatusRepository.js';

/**
 * 本番の Prisma 実装（slice-15 スコープ）。
 * REPORT_CYCLES / 機会（opportunity）のスキーマ追加とマイグレーション実行は統合役（CLAUDE.md §1-2・層境ゲート）。
 * 本スライスではスキーマ変更・マイグレーションが禁止のため未配線（ドメインエラーで明示）。
 * ローカル/CI の緑検証は InMemoryReportStatusRepository（PERSISTENCE=memory）で行う。
 */
export class PrismaReportStatusRepository implements ReportStatusRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async saveCycle(_cycle: ReportCycle): Promise<void> {
    void this.prisma;
    throw new ReportStatusPersistenceUnavailableError('saveCycle');
  }
  async findCycleByStaff(_staffId: string): Promise<ReportCycle | null> {
    void this.prisma;
    throw new ReportStatusPersistenceUnavailableError('findCycleByStaff');
  }
  async findOpportunityById(_id: string): Promise<Opportunity | null> {
    void this.prisma;
    throw new ReportStatusPersistenceUnavailableError('findOpportunityById');
  }
  async saveOpportunity(_opportunity: Opportunity): Promise<void> {
    void this.prisma;
    throw new ReportStatusPersistenceUnavailableError('saveOpportunity');
  }
  async findOpportunitiesByStaff(_staffId: string): Promise<Opportunity[]> {
    void this.prisma;
    throw new ReportStatusPersistenceUnavailableError('findOpportunitiesByStaff');
  }
}
