import { apiFetch } from '@/common/api/client';

/** 承認待ち／承認済みスタッフの1行（backend /admin/staff と等価・snake_case）。 */
export interface StaffAccountRow {
  id: string;
  status: string;
  assignment: { role: string } | null;
  channel: string | null;
  cycle: string | null;
}

export interface PendingStaffDto {
  pending: StaffAccountRow[];
}

/** 承認待ち一覧を取得（slice-17 AC-4・super admin のみ）。権限外は backend が 403 → 例外。 */
export async function fetchPendingStaff(): Promise<PendingStaffDto> {
  return apiFetch<PendingStaffDto>('/admin/staff/pending');
}

export interface ApproveInput {
  assignment: { role: string };
  channel?: string;
  cycle?: string;
}

/** スタッフを承認し担当（主/副）・チャネル・報告サイクルを設定（slice-17 AC-2）。不正ロールは backend が 422 → 例外。 */
export async function approveStaff(id: string, input: ApproveInput): Promise<StaffAccountRow> {
  return apiFetch<StaffAccountRow>(`/admin/staff/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
