/**
 * ホーム集約が reports を参照するための **read 専用ポート**（slice-07）。
 * reports 本体（slice-01〜05）には触れず、状態判定に必要な最小限（id・status）だけを読む。
 * 具体実装は composition root（app.ts）で reportRepository を薄くラップして注入する。
 * router → use-case → (このポート) の一方向を守る（ADR-0011）。
 */

/** 状態判定に必要な最小ビュー（reports のエンティティ全体は渡さない）。 */
export interface ReportSummaryView {
  id: string;
  status: 'draft' | 'confirmed';
}

export interface ReportSummaryReaderInterface {
  /** ユーザーの現在の下書き（無ければ null）。today_status=draft_exists と導線の判定に使う。 */
  findDraftByUser(userId: string): Promise<ReportSummaryView | null>;
  /** ユーザーの全報告（確定済みの有無を判定するために読む）。 */
  findAllByUser(userId: string): Promise<ReportSummaryView[]>;
}
