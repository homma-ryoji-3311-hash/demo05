import type { GroupSetting, ReportSnapshot } from '../model/groupSetting.js';

/**
 * グループ設定の read/write ＋ 過去報告スナップショット read ＋ 現在所属 write ポート（slice-22）。
 * スナップショットは read のみ（過去は不変・移管や設定変更で書き換えない）。
 */
export interface GroupSettingRepositoryInterface {
  findSetting(groupId: string): Promise<GroupSetting | null>;
  saveSetting(setting: GroupSetting): Promise<void>;
  findSnapshot(reportId: string): Promise<ReportSnapshot | null>;
  /** 現在の所属のみ変更（移管・AC-5）。過去 snapshot は変えない。 */
  setCurrentGroup(staffId: string, groupId: string): Promise<void>;
}
