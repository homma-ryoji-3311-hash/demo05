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
  /** ユーザーの報告一覧（report_date 降順）。slice-04 の一覧・slice-07 のホーム集約に使う。 */
  findByUser(userId: string): Promise<ReportEntity[]>;
  /** ユーザーの直近の確定報告（exceptId を除く）。無ければ null。slice-05 の前回参照に使う。 */
  findLatestConfirmedByUser(userId: string, exceptId: string): Promise<ReportEntity | null>;
}
