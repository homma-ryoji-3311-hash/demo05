import type { ReportEntity } from '../model/report.js';

/**
 * 報告リポジトリのインターフェース。実装は infra/repository/ に置き、
 * app.ts（コンポジションルート）で注入する（router → service → repository の一方向）。
 */
export interface ReportRepositoryInterface {
  save(report: ReportEntity): Promise<void>; // upsert
  findById(id: string): Promise<ReportEntity | null>;
  /** ユーザーの現在の下書き（status=draft）を返す。無ければ null。S3 の下書き復元に使う。 */
  findDraftByUser(userId: string): Promise<ReportEntity | null>;
}
