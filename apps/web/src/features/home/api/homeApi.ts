import { apiFetch } from '@/common/api/client';

/** ホームの今日の報告状況（backend /home と等価・snake_case）。 */
export type TodayStatus = 'none' | 'draft_exists' | 'confirmed';

export interface HomeDto {
  today_status: TodayStatus;
  /** 下書きがあれば id を持つ。無ければ null。 */
  draft: { id: string } | null;
  links: { new_report: string; drafts: string | null };
}

/** S2 ホームの集約データを取得する（slice-07）。未ログインは backend が 401 → apiFetch が例外にする。 */
export async function fetchHome(): Promise<HomeDto> {
  return apiFetch<HomeDto>('/home');
}
