import { apiFetch } from '@/common/api/client';

/** backend の業務報告レスポンス（snake_case）。 */
export interface ReportDto {
  id: string;
  user_id: string;
  report_date: string;
  raw_text: string;
  status: string;
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
