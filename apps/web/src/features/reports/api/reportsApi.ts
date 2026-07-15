import { apiFetch } from '@/common/api/client';

/** AI 要約の固定スキーマ（4カテゴリ）。各カテゴリは短文の配列。 */
export interface SummaryDto {
  incidents: string[];
  achievements: string[];
  issues: string[];
  skills: string[];
}

/** 要約カテゴリのキー順（表示順の正本）。 */
export const SUMMARY_KEYS = ['incidents', 'achievements', 'issues', 'skills'] as const;
export type SummaryKey = (typeof SUMMARY_KEYS)[number];

/** backend の業務報告レスポンス（snake_case）。 */
export interface ReportDto {
  id: string;
  user_id: string;
  report_date: string;
  raw_text: string;
  status: string;
  confirmed_summary?: SummaryDto | null;
}

/** GET /reports/:id/previous のレスポンス。前回が無ければ previous: null。 */
export interface PreviousDto {
  previous: {
    raw_text: string;
    summary: SummaryDto;
  } | null;
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

/** 下書きを AI 要約する（S4）。失敗時は 502 で apiFetch が例外を投げる。 */
export async function summarizeReport(id: string): Promise<SummaryDto> {
  return apiFetch<SummaryDto>(`/reports/${id}/summarize`, { method: 'POST' });
}

/** 編集済み要約で報告を確定する（S4）。status=confirmed の報告が返る。 */
export async function confirmReport(id: string, summary: SummaryDto): Promise<ReportDto> {
  return apiFetch<ReportDto>(`/reports/${id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ summary }),
  });
}

/** 自分の業務報告一覧を取得する（S5）。 */
export async function fetchReports(): Promise<ReportDto[]> {
  const res = await apiFetch<{ reports: ReportDto[] }>('/reports');
  return res.reports;
}

/** 業務報告の詳細を取得する（S5）。 */
export async function fetchReport(id: string): Promise<ReportDto> {
  return apiFetch<ReportDto>(`/reports/${id}`);
}

/** 指定報告から見た「前回の確定報告」を取得する（S3・読み取り専用）。 */
export async function fetchPrevious(id: string): Promise<PreviousDto> {
  return apiFetch<PreviousDto>(`/reports/${id}/previous`);
}
