import { Opportunity, type OpportunityProps } from '../../domain/model/opportunity.js';
import { ReportCycle, type ReportCycleProps } from '../../domain/model/reportCycle.js';
import type { ReportStatusRepositoryInterface } from '../../domain/interface/reportStatusRepository.js';

/**
 * インメモリ実装（テストダブル）。サイクルは staff 単位、機会は id 単位で保持。
 * 機会 seed はオラクル(server.mjs opportunities)と同一＝5 ステータス遷移の観測源（PERSISTENCE=memory）。
 * 本番は PrismaReportStatusRepository。マイグレーション実行は統合役（CLAUDE.md §1-2）。
 */
export class InMemoryReportStatusRepository implements ReportStatusRepositoryInterface {
  private readonly cycles = new Map<string, ReportCycleProps>();
  private readonly opportunities = new Map<string, OpportunityProps>();

  async saveCycle(cycle: ReportCycle): Promise<void> {
    this.cycles.set(cycle.staffId, cycle.toPersistence());
  }

  async findCycleByStaff(staffId: string): Promise<ReportCycle | null> {
    const r = this.cycles.get(staffId);
    return r ? ReportCycle.reconstruct(r) : null;
  }

  async findOpportunityById(id: string): Promise<Opportunity | null> {
    const r = this.opportunities.get(id);
    return r ? Opportunity.reconstruct(r) : null;
  }

  async saveOpportunity(opportunity: Opportunity): Promise<void> {
    this.opportunities.set(opportunity.id, opportunity.toPersistence());
  }

  async findOpportunitiesByStaff(staffId: string): Promise<Opportunity[]> {
    return [...this.opportunities.values()]
      .filter((o) => o.staffId === staffId && o.eligible)
      .map((o) => Opportunity.reconstruct(o));
  }
}

/**
 * dev/受け入れ用の機会シード（合成のみ・憲法 §1-6）。オラクル(server.mjs opportunities)と同一。
 * staff01 の5機会＝5 ステータス遷移の観測源: opp_sub(提出済み)/opp_late(遅延提出)/opp_missing(未報告)/
 * opp_flag(未報告→報告漏れの計上対象)/opp_absent(未報告→欠勤の承認対象)。
 */
export function seedReportStatus(repo: InMemoryReportStatusRepository): void {
  const base = { staffId: 'staff01', eligible: true, confirmedAt: null, flaggedMissing: false, absenceApproved: false };
  const opps: OpportunityProps[] = [
    {
      ...base,
      id: 'opp_sub',
      date: '2026-07-14',
      deadlineUtc: '2026-07-14T09:00:00Z',
      confirmedAt: '2026-07-14T08:30:00Z',
    },
    {
      ...base,
      id: 'opp_late',
      date: '2026-07-13',
      deadlineUtc: '2026-07-13T09:00:00Z',
      confirmedAt: '2026-07-13T10:00:00Z',
    },
    { ...base, id: 'opp_missing', date: '2026-07-12', deadlineUtc: '2026-07-12T09:00:00Z' },
    { ...base, id: 'opp_flag', date: '2026-07-11', deadlineUtc: '2026-07-11T09:00:00Z' },
    { ...base, id: 'opp_absent', date: '2026-07-10', deadlineUtc: '2026-07-10T09:00:00Z' },
  ];
  for (const o of opps) void repo.saveOpportunity(Opportunity.reconstruct(o));
}
