import type { RosterStaff, StaffRosterReaderInterface } from '../../domain/interface/staffRosterReader.js';

/** インメモリのスタッフ台帳（テスト・dev）。合成 seed を注入する。 */
export class InMemoryStaffRosterReader implements StaffRosterReaderInterface {
  constructor(private readonly roster: RosterStaff[]) {}

  async list(): Promise<RosterStaff[]> {
    return this.roster;
  }
}

/**
 * オラクル(server.mjs bulkStaff)と同一の合成台帳（slice-21・parity）。
 * bs_1/bs_2 は has_master（生成対象）・bs_3 は未生成（スキップ＋manifest・AC-5）。bulk_mgr は grp_engineer/grp_sales 担当。
 */
export function seedStaffRoster(): RosterStaff[] {
  return [
    { id: 'bs_1', name: 'テスト 太郎', client: 'A社', dept: '開発部', group_id: 'grp_engineer', has_master: true },
    { id: 'bs_2', name: 'テスト 花子', client: 'B社', dept: '開発部', group_id: 'grp_engineer', has_master: true },
    { id: 'bs_3', name: 'テスト 次郎', client: 'A社', dept: '営業部', group_id: 'grp_sales', has_master: false },
  ];
}
