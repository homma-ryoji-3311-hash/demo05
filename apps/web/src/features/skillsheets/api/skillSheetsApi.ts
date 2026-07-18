import { apiFetch } from '@/common/api/client';

/** 生成済みスキルシートの content（固定スキーマ・snake_case）。 */
export interface SkillSheetContentDto {
  career_summary: string[];
  skills: string[];
  issues: string[];
}

/** backend の生成済みスキルシート（snake_case）。 */
export interface SkillSheetDto {
  id: string;
  staff_id: string;
  filename: string;
  file_url: string;
  created_at: string;
  content: SkillSheetContentDto;
}

/** 自分の生成済みシート一覧（slice-09 AC-1）。生成日時の新しい順・履歴込み。他人は backend が除く。 */
export async function fetchSkillSheets(): Promise<SkillSheetDto[]> {
  const res = await apiFetch<{ sheets: SkillSheetDto[] }>('/skill-sheets');
  return res.sheets;
}

/**
 * シートの HTML プレビュー（slice-09 AC-5）を取得する。
 * プレビューは text/html を返すため、JSON 前提の apiFetch ではなく生 fetch でテキストを取る。
 * セッション（localStorage 'session'）を X-User-Id として送る（client.ts と同じ認証 seam）。
 * 他人（403）・無し（404）は backend が返し、ここは例外にして画面が失敗表示する。
 */
export async function fetchSkillSheetPreview(id: string): Promise<string> {
  const headers = new Headers();
  const session = typeof localStorage !== 'undefined' ? localStorage.getItem('session') : null;
  if (session) headers.set('X-User-Id', session);
  const res = await fetch(`/skill-sheets/${id}/preview`, { headers });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.text();
}
