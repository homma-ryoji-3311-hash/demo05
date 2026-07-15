import { ReportEntity, type ReportProps } from '../../domain/model/report.js';
import type { ReportRepositoryInterface } from '../../domain/interface/reportRepository.js';

/**
 * インメモリ実装（テストダブル）。ReportRepositoryInterface を満たす本物の実装で、
 * DB なしで HTTP フローを検証できる（受け入れテストの緑検証・inMemoryGreetingRepository と同型）。
 * 本番は PrismaReportRepository。マイグレーションの実行は統合役（CLAUDE.md §1-2）。
 */
export class InMemoryReportRepository implements ReportRepositoryInterface {
  private readonly records = new Map<string, ReportProps>();

  async save(report: ReportEntity): Promise<void> {
    this.records.set(report.id, report.toPersistence());
  }

  async findById(id: string): Promise<ReportEntity | null> {
    const r = this.records.get(id);
    return r ? ReportEntity.reconstruct(r) : null;
  }

  async findDraftByUser(userId: string): Promise<ReportEntity | null> {
    for (const r of this.records.values()) {
      if (r.userId === userId && r.status === 'draft') return ReportEntity.reconstruct(r);
    }
    return null;
  }
}

/**
 * dev/受け入れ用のシード（合成データのみ）。
 * - r_seed_confirmed: AC-3（確定後不変 → 409）検証用の確定済み報告。
 * - r_seed_draft:     S3 の「再訪時に下書きが復元される」（ui.spec）検証用の下書き。
 */
export function seedReports(repo: InMemoryReportRepository): void {
  void repo.save(
    ReportEntity.reconstruct({
      id: 'r_seed_confirmed',
      userId: 'staff01',
      reportDate: '2026-07-13',
      rawText: '前々日はテスト整備を実施。',
      status: 'confirmed',
    }),
  );
  void repo.save(
    ReportEntity.reconstruct({
      id: 'r_seed_draft',
      userId: 'staff01',
      reportDate: '2026-07-15',
      rawText: '書きかけの下書き本文。',
      status: 'draft',
    }),
  );
}
