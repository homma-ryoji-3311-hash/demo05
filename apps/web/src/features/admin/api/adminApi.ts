import { apiFetch } from '@/common/api/client';

/** 報告状況（§3.9 の二値・backend と等価）。5 ステータスは slice-15。 */
export type ReportStatus = 'reported' | 'not_reported';

/** スタッフ一覧の1行（backend /admin/staff と等価・snake_case）。 */
export interface AdminStaffRow {
  id: string;
  name: string;
  group_id: string;
  client_name: string;
  last_report_at: string | null;
  report_status: ReportStatus;
  has_latest_sheet: boolean;
}

export interface AdminStaffDto {
  /** 担当グループ一覧（タブ用）。 */
  groups: string[];
  staff: AdminStaffRow[];
}

/** 担当グループのスタッフ一覧を取得（slice-14）。`group` 指定でタブ絞り込み。未ログイン/権限外は backend が 401/403 → 例外。 */
export async function fetchAdminStaff(group?: string): Promise<AdminStaffDto> {
  const qs = group ? `?group=${encodeURIComponent(group)}` : '';
  return apiFetch<AdminStaffDto>(`/admin/staff${qs}`);
}
