/**
 * 確定時の案件紐づけポート（slice-11）。reports の confirm が依存する seam。
 * 実装は projects フィーチャー側（LinkReportProjectsUseCase）で、app.ts（合成ルート）で注入する
 * ——フィーチャー間の直接 import を避けるため（no-cross-feature-import・home の reportSummaryReader と同型）。
 * 不正な incident status は実装が検証で 422（confirm 前に throw＝原子性）を投げる。
 */
export interface LinkedProject {
  id: string;
  project_key: string;
  client_name: string | null;
  status: string;
}

export interface LinkedIncident {
  project_id: string;
  status: string;
}

export interface ProjectLinkResult {
  projects: LinkedProject[];
  incidents: LinkedIncident[];
}

export interface ProjectLinkerInterface {
  link(input: { userId: string; projects: unknown }): Promise<ProjectLinkResult>;
}
