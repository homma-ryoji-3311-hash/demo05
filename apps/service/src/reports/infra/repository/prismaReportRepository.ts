import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { ReportEntity, type ReportStatus, type StructuredSummary } from '../../domain/model/report.js';
import type { ReportRepositoryInterface } from '../../domain/interface/reportRepository.js';

/**
 * 本番の Prisma 実装（slice-01 スコープ）。schema.prisma の Report とマイグレーションの実行は
 * 統合役（CLAUDE.md §1-2）。ローカルの緑検証は InMemoryReportRepository（PERSISTENCE=memory）で行う。
 */
export class PrismaReportRepository implements ReportRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async save(report: ReportEntity): Promise<void> {
    const p = report.toPersistence();
    const ai = toJsonInput(p.aiSummaryJson);
    const confirmed = toJsonInput(p.confirmedSummary);
    await this.prisma.report.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        userId: p.userId,
        reportDate: p.reportDate,
        rawText: p.rawText,
        status: p.status,
        aiSummaryJson: ai,
        confirmedSummary: confirmed,
      },
      update: { rawText: p.rawText, status: p.status, aiSummaryJson: ai, confirmedSummary: confirmed },
    });
  }

  async findById(id: string): Promise<ReportEntity | null> {
    const r = await this.prisma.report.findUnique({ where: { id } });
    return r ? this.toEntity(r) : null;
  }

  async findDraftByUser(userId: string): Promise<ReportEntity | null> {
    const r = await this.prisma.report.findFirst({ where: { userId, status: 'draft' } });
    return r ? this.toEntity(r) : null;
  }

  async findLastConfirmedByUser(userId: string, excludeId: string): Promise<ReportEntity | null> {
    const r = await this.prisma.report.findFirst({
      where: { userId, status: 'confirmed', id: { not: excludeId } },
      orderBy: { reportDate: 'desc' },
    });
    return r ? this.toEntity(r) : null;
  }

  private toEntity(r: {
    id: string;
    userId: string;
    reportDate: string;
    rawText: string;
    status: string;
    aiSummaryJson: unknown;
    confirmedSummary: unknown;
  }): ReportEntity {
    return ReportEntity.reconstruct({
      id: r.id,
      userId: r.userId,
      reportDate: r.reportDate,
      rawText: r.rawText,
      status: r.status as ReportStatus,
      aiSummaryJson: (r.aiSummaryJson as StructuredSummary | null) ?? null,
      confirmedSummary: (r.confirmedSummary as StructuredSummary | null) ?? null,
    });
  }
}

/** nullable Json カラムへの書き込み値。null は DB NULL（Prisma.DbNull）に変換する。 */
function toJsonInput(value: StructuredSummary | null): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null ? Prisma.DbNull : (value as unknown as Prisma.InputJsonValue);
}
