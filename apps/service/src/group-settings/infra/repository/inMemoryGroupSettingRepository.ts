import type { GroupSettingRepositoryInterface } from '../../domain/interface/groupSettingRepository.js';
import type { GroupSetting, ReportSnapshot } from '../../domain/model/groupSetting.js';

/** インメモリのグループ設定ストア（テスト・dev）。設定・スナップショット・現在所属を保持。 */
export class InMemoryGroupSettingRepository implements GroupSettingRepositoryInterface {
  private readonly settings = new Map<string, GroupSetting>();
  private readonly snapshots = new Map<string, ReportSnapshot>();
  private readonly currentGroup = new Map<string, string>();

  async findSetting(groupId: string): Promise<GroupSetting | null> {
    return this.settings.get(groupId) ?? null;
  }
  async saveSetting(setting: GroupSetting): Promise<void> {
    this.settings.set(setting.group_id, setting);
  }
  async findSnapshot(reportId: string): Promise<ReportSnapshot | null> {
    return this.snapshots.get(reportId) ?? null;
  }
  async setCurrentGroup(staffId: string, groupId: string): Promise<void> {
    this.currentGroup.set(staffId, groupId);
  }

  /** seed 専用（過去スナップショットは通常経路では書けない＝不変）。 */
  seedSnapshot(snap: ReportSnapshot): void {
    this.snapshots.set(snap.report_id, snap);
  }
}

/**
 * オラクル(server.mjs groupSettings/reportSnapshots)と同一の合成 seed（slice-22・parity）。
 * grp_a(v2/style_default)・grp_b(v1/style_marketer)。grp_c は未設定（AC-2 で追加される）。
 * rs_past は grp_a の確定報告スナップショット（不変・AC-3/AC-5）。
 */
export function seedGroupSettings(repo: InMemoryGroupSettingRepository): void {
  void repo.saveSetting({
    group_id: 'grp_a',
    question_set_version: 'v2',
    template_style: 'style_default',
    tab_label: '開発',
    effective_from: '2026-07-01',
  });
  void repo.saveSetting({
    group_id: 'grp_b',
    question_set_version: 'v1',
    template_style: 'style_marketer',
    tab_label: 'マーケ',
    effective_from: '2026-07-01',
  });
  repo.seedSnapshot({
    report_id: 'rs_past',
    staff_id: 'gs_staff',
    group_id: 'grp_a',
    applied_settings: { question_set_version: 'v2', template_style: 'style_default' },
  });
}
