import type { ReportEntity } from '../model/report.js';

/**
 * 報告リポジトリのインターフェース（slice-01 スコープ）。実装は infra/repository/ に置き、
 * app.ts（コンポジションルート）で注入する（router → service(use-case) → repository の一方向）。
 * 一覧・前回参照など後続スライスのメソッドは、そのスライスで追加する。
 */
export interface ReportRepositoryInterface {
  save(report: ReportEntity): Promise<void>; // upsert
  findById(id: string): Promise<ReportEntity | null>;
  /** ユーザーの現在の下書き（status=draft）を返す。無ければ null。S3 の下書き復元に使う。 */
  findDraftByUser(userId: string): Promise<ReportEntity | null>;
  /** ユーザーの報告を日付の新しい順に返す（slice-04 AC-1）。所有者の絞り込みは実装側で行う。 */
  findAllByUser(userId: string): Promise<ReportEntity[]>;
  /**
   * 直近の確定報告（前回参照・slice-05）。同一ユーザー・status=confirmed・`excludeId` を除く中で
   * reportDate が最新の1件を返す。無ければ null。読み取り専用（何も書き換えない）。
   */
  findPreviousConfirmed(userId: string, excludeId: string): Promise<ReportEntity | null>;
}
