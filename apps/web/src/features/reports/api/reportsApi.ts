import { apiFetch } from '@/common/api/client';

/** backend の業務報告レスポンス（snake_case）。 */
export interface ReportDto {
  id: string;
  user_id: string;
  report_date: string;
  raw_text: string;
  status: string;
  /** 確定済みのときだけ中身が入る（slice-04 の詳細表示で使う）。 */
  confirmed_summary?: SummaryDto | null;
}

/** 自分の報告一覧（slice-04 AC-1）。他人の報告は backend が除く。 */
export async function fetchReports(): Promise<ReportDto[]> {
  const res = await apiFetch<{ reports: ReportDto[] }>('/reports');
  return res.reports;
}

/** 報告1件の詳細（slice-04 AC-2）。他人の報告は backend が 403 にする＝apiFetch が例外にする。 */
export async function fetchReport(id: string): Promise<ReportDto> {
  return apiFetch<ReportDto>(`/reports/${id}`);
}

/** 現在の下書きを取得（無ければ null）。S3 の再訪時復元に使う。 */
export async function fetchDraft(): Promise<ReportDto | null> {
  const res = await apiFetch<ReportDto | { draft: null }>('/reports/draft');
  return 'id' in res ? res : null;
}

/** 下書きを新規作成する（report_date は当日）。 */
export async function createDraft(rawText: string): Promise<ReportDto> {
  const today = new Date().toISOString().slice(0, 10);
  return apiFetch<ReportDto>('/reports', {
    method: 'POST',
    body: JSON.stringify({ raw_text: rawText, report_date: today }),
  });
}

/** 既存の下書き本文を更新する（自動保存）。 */
export async function updateDraft(id: string, rawText: string): Promise<ReportDto> {
  return apiFetch<ReportDto>(`/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ raw_text: rawText }),
  });
}

/** AI 要約の固定スキーマ（4カテゴリ・提供元非依存）。backend の抽象化層が返す形と同じ。 */
export interface SummaryDto {
  incidents: string[];
  achievements: string[];
  issues: string[];
  skills: string[];
}

/**
 * 対象報告の直近の確定報告（前回参照・slice-05）を取得する。無ければ null。
 * backend の `GET /reports/:id/previous` を叩く（読み取り専用）。API 消費者向け。
 */
export async function fetchPrevious(id: string): Promise<{ raw_text: string; summary: SummaryDto | null } | null> {
  const res = await apiFetch<{ previous: { raw_text: string; summary: SummaryDto | null } | null }>(
    `/reports/${id}/previous`,
  );
  return res.previous;
}

/** 下書きを要約する（slice-02）。失敗（502 等）は apiFetch が例外にする＝画面は失敗状態を出す。 */
export async function summarizeReport(id: string): Promise<SummaryDto> {
  return apiFetch<SummaryDto>(`/reports/${id}/summarize`, { method: 'POST' });
}

/**
 * 報告を確定する（slice-03）。人が編集した要約を確定値として送る。
 * 二重確定・確定後の変更は backend が 409 にする＝apiFetch が例外にする（確定後不変）。
 */
export async function confirmReport(id: string, summary: SummaryDto): Promise<ReportDto> {
  return apiFetch<ReportDto>(`/reports/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ summary }),
  });
}
