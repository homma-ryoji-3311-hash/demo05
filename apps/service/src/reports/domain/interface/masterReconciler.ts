/**
 * 確定時の突合ポート（slice-12・ADR-0019）。reports の confirm が依存する seam。
 * 実装は master-summaries フィーチャー側（ReconcileMasterUseCase）で、app.ts（合成ルート）で注入する
 * ——フィーチャー間の直接 import を避けるため（no-cross-feature-import・projectLinker と同型）。
 */
export interface MasterSummaryView {
  user_id: string;
  project_id: string;
  period: string;
  summary: { incidents: { key: string; status: string }[] };
  reconciled_at: string;
}

export interface MasterReconcilerInterface {
  /**
   * 確定報告の案件を突合する。`projects` は project_id ＋ incident（key つき）の組。
   * project_id は confirm が紐づけ結果（projectLinker）から解決して渡す。
   */
  reconcile(input: {
    userId: string;
    reportDate: string;
    projects: { project_id: string; incidents: { key?: string; status: string }[] }[];
  }): Promise<MasterSummaryView[]>;
}
