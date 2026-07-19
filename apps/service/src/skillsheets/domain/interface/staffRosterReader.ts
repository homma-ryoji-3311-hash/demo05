/** 客先/部署/グループ属性つきスタッフ台帳の1行（slice-21・cross-module read）。 */
export interface RosterStaff {
  id: string;
  name: string;
  client: string;
  dept: string;
  group_id: string;
  /** 最新マスターが生成済みか（false は一括生成でスキップ・AC-5）。 */
  has_master: boolean;
}

/** スタッフ台帳を読む read ポート（slice-21・一括生成の対象決定）。 */
export interface StaffRosterReaderInterface {
  list(): Promise<RosterStaff[]>;
}
