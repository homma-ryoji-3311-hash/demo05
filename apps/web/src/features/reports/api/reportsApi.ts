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

/** ソフト設問回答（slice-20・送信形）。雑感はサーバで AI/シートから完全除外・応答には出さない。 */
export interface SoftAnswersInput {
  ai_use?: string;
  issue?: string;
  shokan?: string;
  zakkan?: string;
  zakkan_visibility?: 'limited' | 'private';
}

/** ソフト設問回答を保存（slice-20・本人のみ）。応答は { id, saved } のみ（雑感・スコアは返らない）。 */
export async function saveSoftAnswers(id: string, data: SoftAnswersInput): Promise<{ id: string; saved: boolean }> {
  return apiFetch<{ id: string; saved: boolean }>(`/reports/${encodeURIComponent(id)}/soft-answers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** AI 追加質問の状態（slice-23・backend と等価）。 */
export interface FollowUpDto {
  state: string;
  required?: boolean;
  question?: string;
}

/** 追加質問を生成・提示（slice-23・一度きり・薄い項目のみ）。既に提示済みなら同一を返す。 */
export async function requestFollowUp(id: string): Promise<FollowUpDto> {
  return apiFetch<FollowUpDto>(`/reports/${encodeURIComponent(id)}/follow-up`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/** 追加質問へ回答（slice-23・本文へ追記＋要約作り直し・下書きのまま）。 */
export async function answerFollowUp(id: string, answer: string): Promise<{ raw_text: string; status: string }> {
  return apiFetch<{ raw_text: string; status: string }>(`/reports/${encodeURIComponent(id)}/follow-up/answer`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  });
}

/** 履行状況の5ステータス（slice-15・backend と等価）。 */
export type FulfillmentStatus = 'submitted' | 'late' | 'missing' | 'unreported_flagged' | 'absent';

/** 履行状況の機会（本人の read-only ビュー・slice-15 AC-6）。 */
export interface ReportStatusOpportunityDto {
  id: string;
  staff_id: string;
  date: string;
  deadline_utc: string;
  status: FulfillmentStatus;
}

/** 本人の履行状況（5ステータス）を read-only で取得する（slice-15 AC-6）。 */
export async function fetchMyReportStatus(): Promise<ReportStatusOpportunityDto[]> {
  const res = await apiFetch<{ opportunities: ReportStatusOpportunityDto[] }>('/me/report-status');
  return res.opportunities;
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
