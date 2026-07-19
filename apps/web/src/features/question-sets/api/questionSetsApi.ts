import { apiFetch } from '@/common/api/client';

export type RoleTag = 'project_key' | 'status' | 'skill' | 'internal_only';

/** 編集中の設問（送信形・backend と等価）。 */
export interface QuestionInput {
  format: string;
  required: boolean;
  role_tag: string;
  text: string;
}

export interface QuestionSetDto {
  id: string;
  group_id: string;
  version: number | null;
  status: string;
  questions: Array<{ order: number; format: string; required: boolean; role_tag: string; text: string }>;
}

/** 設問セットを作成（下書き・slice-19）。manager 以外は backend が 403 → 例外。 */
export async function createQuestionSet(input: {
  group_id: string;
  questions: QuestionInput[];
}): Promise<QuestionSetDto> {
  return apiFetch<QuestionSetDto>('/question-sets', { method: 'POST', body: JSON.stringify(input) });
}

/** 公開の結果: 公開済み、または不足役割（ガードレール 422）。 */
export type PublishResult = { published: QuestionSetDto } | { missing_roles: RoleTag[] };

/**
 * 設問セットを公開（slice-19 AC-3）。ガードレール不足は 422 で missing_roles を返す（例外にせず提示するため raw fetch）。
 * セッション（X-User-Id）は apiFetch と同じく localStorage 'session' から付与する。
 */
export async function publishQuestionSet(id: string): Promise<PublishResult> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  const session = typeof localStorage !== 'undefined' ? localStorage.getItem('session') : null;
  if (session) headers.set('X-User-Id', session);
  const res = await fetch(`/question-sets/${encodeURIComponent(id)}/publish`, { method: 'POST', headers });
  const body = (await res.json().catch(() => ({}))) as { missing_roles?: RoleTag[] } & QuestionSetDto;
  if (res.status === 422) return { missing_roles: body.missing_roles ?? [] };
  if (!res.ok) throw new Error(`publish failed ${res.status}`);
  return { published: body };
}
