import { apiFetch } from '@/common/api/client';

/** GET /home のレスポンス（S2 スタッフ用ホームの集約データ）。 */
export interface HomeDto {
  today_status: string;
  draft: { id: string } | null;
  links: {
    new_report: string;
    drafts: string;
  };
}

/** ホーム集約を取得する（S2）。 */
export async function fetchHome(): Promise<HomeDto> {
  return apiFetch<HomeDto>('/home');
}
