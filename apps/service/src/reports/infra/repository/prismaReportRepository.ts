import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import { ReportEntity, type ReportStatus } from '../../domain/model/report.js';
import type { ReportRepositoryInterface } from '../../domain/interface/reportRepository.js';

/**
 * 本番の Prisma 実装。スキーマ（prisma/schema.prisma の Report）はこのスライスで追加するが、
 * **マイグレーションの実行は統合役**（CLAUDE.md §1-2）。ローカルの緑検証は InMemoryReportRepository で行う。
 */
export class PrismaReportRepository implements ReportRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async save(report: ReportEntity): Promise<void> {
    const p = report.toPersistence();
    await this.prisma.report.upsert({
      where: { id: p.id },
      create: { id: p.id, userId: p.userId, reportDate: p.reportDate, rawText: p.rawText, status: p.status },
      update: { rawText: p.rawText, status: p.status },
    });
  }

  async findById(id: string): Promise<ReportEntity | null> {
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) return null;
    return ReportEntity.reconstruct({
      id: r.id,
      userId: r.userId,
      reportDate: r.reportDate,
      rawText: r.rawText,
      status: r.status as ReportStatus,
    });
  }
}
