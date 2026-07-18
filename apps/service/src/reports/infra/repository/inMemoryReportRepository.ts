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

  /** 所有者で絞り、日付の新しい順に返す（slice-04 AC-1）。 */
  async findAllByUser(userId: string): Promise<ReportEntity[]> {
    return [...this.records.values()]
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
      .map((r) => ReportEntity.reconstruct(r));
  }

  /** 直近の確定報告（対象を除く・同一ユーザー・reportDate 最新1件）。前回参照（slice-05）。 */
  async findPreviousConfirmed(userId: string, excludeId: string): Promise<ReportEntity | null> {
    const prev = [...this.records.values()]
      .filter((r) => r.userId === userId && r.status === 'confirmed' && r.id !== excludeId)
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
    return prev ? ReportEntity.reconstruct(prev) : null;
  }
}

/**
 * dev/受け入れ用のシード（合成データのみ）。オラクル(tools/reference-mock-server/server.mjs)と同一。
 * - r_seed_confirmed: staff01 の確定済み報告。AC-3（確定後不変 → 409）の対象。
 * - r_seed_draft:     staff01 の下書き。S3 の「再訪時に下書きが復元される」（ui.spec）検証用。
 * - r_other:          staff02（他人）の確定済み報告。一覧に混ざらないこと・詳細が 403 になることの検証用
 *                     （slice-04 AC-1/AC-3・slice-06）。これが無いと AC-3 は 403 ではなく 404 になる。
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
  void repo.save(
    ReportEntity.reconstruct({
      id: 'r_other',
      userId: 'staff02',
      reportDate: '2026-07-14',
      rawText: '他スタッフの報告。',
      status: 'confirmed',
      aiSummaryJson: { incidents: [], achievements: [], issues: [], skills: [] },
      confirmedSummary: { incidents: [], achievements: [], issues: [], skills: [] },
    }),
  );
}
