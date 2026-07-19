import type { AdminStaffRow } from '../model/adminStaffRow.js';

/**
 * 管理者コンソールのスタッフ台帳 read ポート（slice-14）。
 * 担当グループの集合に属するスタッフ行だけを返す（可視範囲の絞り込みは use-case が担い、
 * ここは group_id の集合フィルタのみ・オラクル adminStaff と等価）。
 */
export interface AdminStaffReaderInterface {
  findByGroups(groupIds: string[]): Promise<AdminStaffRow[]>;
}
