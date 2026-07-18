import { apiFetch } from '@/common/api/client';

/** backend の Excel テンプレート（snake_case）。 */
export interface TemplateDto {
  id: string;
  group_id: string;
  version: string;
  anchor_map: Record<string, string>;
  file_url: string;
  is_active: boolean;
  uploaded_by: string;
  created_at: string;
}

/** 自グループの版一覧（slice-10 AC-3）。生成日時の新しい順・履歴込み・有効版フラグつき。manager のみ。 */
export async function fetchTemplates(): Promise<TemplateDto[]> {
  const res = await apiFetch<{ templates: TemplateDto[] }>('/templates');
  return res.templates;
}

/** アンカー付きテンプレートをアップロード（slice-10 AC-1/AC-2）。欠落は backend が 422＝apiFetch が例外化。 */
export async function uploadTemplate(anchorMap: Record<string, string>): Promise<TemplateDto> {
  return apiFetch<TemplateDto>('/templates', {
    method: 'POST',
    body: JSON.stringify({ anchor_map: anchorMap }),
  });
}

/** 有効版に切り替える（slice-10 AC-3）。旧版は backend が履歴として残す（削除しない）。 */
export async function activateTemplate(id: string): Promise<TemplateDto> {
  return apiFetch<TemplateDto>(`/templates/${id}/activate`, { method: 'PUT' });
}
