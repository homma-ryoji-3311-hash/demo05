import { ReportEntity, type ReportProps } from '../../domain/model/report.js';
import type { ReportRepositoryInterface } from '../../domain/interface/reportRepository.js';

/**
 * インメモリ実装（テストダブル）。ReportRepositoryInterface を満たす本物の実装で、
 * DB なしで HTTP フローを検証できる（受け入れテストの緑検証・PERSISTENCE=memory）。
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

  async findLastConfirmedByUser(userId: string, excludeId: string): Promise<ReportEntity | null> {
    let latest: ReportProps | null = null;
    for (const r of this.records.values()) {
      if (r.userId !== userId || r.status !== 'confirmed' || r.id === excludeId) continue;
      if (latest === null || r.reportDate > latest.reportDate) latest = r;
    }
    return latest ? ReportEntity.reconstruct(latest) : null;
  }
}

/**
 * dev/受け入れ用のシード（合成データのみ）。オラクル(tools/reference-mock-server/server.mjs)と同一。
 * - r_seed_confirmed: staff01 の確定済み報告。AC-3（確定後不変 → 409）の対象。
 * - r_seed_draft:     staff01 の下書き。S3 の「再訪時に下書きが復元される」（ui.spec）検証用。
 */
export function seedReports(repo: InMemoryReportRepository): void {
  void repo.save(
    ReportEntity.reconstruct({
      id: 'r_seed_confirmed',
      userId: 'staff01',
      reportDate: '2026-07-13',
      rawText: '前々日はテスト整備を実施。',
      status: 'confirmed',
      aiSummaryJson: { incidents: [], achievements: ['テスト整備'], issues: [], skills: [] },
      confirmedSummary: { incidents: [], achievements: ['テスト整備'], issues: [], skills: [] },
    }),
  );
  void repo.save(
    ReportEntity.reconstruct({
      id: 'r_seed_draft',
      userId: 'staff01',
      reportDate: '2026-07-15',
      rawText: '書きかけの下書き本文。',
      status: 'draft',
      aiSummaryJson: null,
      confirmedSummary: null,
    }),
  );
}
