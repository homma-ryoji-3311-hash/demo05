import type { StaffAccount } from '../model/staffApproval.js';

/**
 * スタッフの承認状態・担当属性の read/write ポート（slice-17）。
 * deny-by-default の判定（findById）・承認待ち一覧（listPending）・承認の保存（save）を担う。
 * レコードが無い id は「既存＝active 扱い」（オラクル `status ?? 'active'` と同義）＝ deny 対象外。
 */
export interface StaffAccountRepositoryInterface {
  findById(id: string): Promise<StaffAccount | null>;
  listPending(): Promise<StaffAccount[]>;
  save(account: StaffAccount): Promise<void>;
}
