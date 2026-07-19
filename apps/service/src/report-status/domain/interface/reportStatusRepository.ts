import type { Opportunity } from '../model/opportunity.js';
import type { ReportCycle } from '../model/reportCycle.js';

/**
 * 報告サイクル・機会の read/write ポート（slice-15）。
 * サイクルは staff 単位、機会は id 単位。可視範囲の絞り込み・ロール検査は use-case が担う。
 */
export interface ReportStatusRepositoryInterface {
  saveCycle(cycle: ReportCycle): Promise<void>;
  findCycleByStaff(staffId: string): Promise<ReportCycle | null>;
  findOpportunityById(id: string): Promise<Opportunity | null>;
  saveOpportunity(opportunity: Opportunity): Promise<void>;
  /** 本人の eligible な機会を返す（本人の履行状況閲覧・AC-6）。 */
  findOpportunitiesByStaff(staffId: string): Promise<Opportunity[]>;
}
