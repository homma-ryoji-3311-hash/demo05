import type { AdminStaffRow } from '../../domain/model/adminStaffRow.js';
import type { AdminStaffReaderInterface } from '../../domain/interface/adminStaffReader.js';

/**
 * インメモリ実装（テストダブル）。合成のスタッフ台帳を group_id 集合でフィルタして返す。
 * seed はオラクル(server.mjs adminStaff)と同一＝AC-1 の表示列・AC-2 の担当外(G2)遮断の観測源。
 * 本番は PrismaAdminStaffReader。マイグレーション実行は統合役（CLAUDE.md §1-2）。
 */
export class InMemoryAdminStaffReader implements AdminStaffReaderInterface {
  private readonly roster: AdminStaffRow[] = [
    {
      id: 's_g1_a',
      name: 'テスト 太郎',
      group_id: 'G1',
      client_name: 'クライアントA',
      last_report_at: '2026-07-14T09:00:00Z',
      report_status: 'reported',
      has_latest_sheet: true,
    },
    {
      id: 's_g1_b',
      name: 'テスト 花子',
      group_id: 'G1',
      client_name: 'クライアントB',
      last_report_at: null,
      report_status: 'not_reported',
      has_latest_sheet: false,
    },
    {
      id: 's_g3_a',
      name: 'テスト 次郎',
      group_id: 'G3',
      client_name: 'クライアントC',
      last_report_at: '2026-07-13T08:00:00Z',
      report_status: 'reported',
      has_latest_sheet: false,
    },
    // 担当外 G2（G1/G3 管理者には出さない・AC-2）。可視範囲の絞り込みは use-case が担う。
    {
      id: 's_g2_a',
      name: 'テスト 三郎',
      group_id: 'G2',
      client_name: 'クライアントD',
      last_report_at: '2026-07-12T07:00:00Z',
      report_status: 'reported',
      has_latest_sheet: true,
    },
  ];

  async findByGroups(groupIds: string[]): Promise<AdminStaffRow[]> {
    return this.roster.filter((s) => groupIds.includes(s.group_id)).map((s) => ({ ...s }));
  }
}
