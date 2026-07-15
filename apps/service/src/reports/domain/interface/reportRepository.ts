import type { ReportEntity } from '../model/report.js';

/**
 * 報告リポジトリのインターフェース。実装は infra/repository/ に置き、
 * app.ts（コンポジションルート）で注入する（router → service → repository の一方向）。
 */
export interface ReportRepositoryInterface {
  save(report: ReportEntity): Promise<void>; // upsert
  findById(id: string): Promise<ReportEntity | null>;
}
