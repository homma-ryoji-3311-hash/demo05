import type { GetGroupSettingUseCase } from '../../../use-case/getGroupSetting.js';
import type { UpdateGroupSettingUseCase } from '../../../use-case/updateGroupSetting.js';
import type { TransferStaffGroupUseCase } from '../../../use-case/transferStaffGroup.js';
import type { GetReportSnapshotUseCase } from '../../../use-case/getReportSnapshot.js';
import type { GroupSetting, ReportSnapshot } from '../../../domain/model/groupSetting.js';

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-22 グループ別設定）。
 * 401 は route の authUserId、担当 manager 403・未設定 404・不正 422 は use-case/ドメイン。
 */
export class GroupSettingController {
  constructor(
    private readonly getSetting: GetGroupSettingUseCase,
    private readonly updateSetting: UpdateGroupSettingUseCase,
    private readonly transfer: TransferStaffGroupUseCase,
    private readonly getSnapshot: GetReportSnapshotUseCase,
  ) {}

  async get(groupId: string): Promise<{ status: number; body: GroupSetting }> {
    return { status: 200, body: await this.getSetting.execute({ groupId }) };
  }

  async update(userId: string, groupId: string, body: unknown): Promise<{ status: number; body: GroupSetting }> {
    return { status: 200, body: await this.updateSetting.execute({ userId, groupId, body }) };
  }

  async snapshot(reportId: string): Promise<{ status: number; body: ReportSnapshot }> {
    return { status: 200, body: await this.getSnapshot.execute({ reportId }) };
  }

  async transferStaff(
    userId: string,
    staffId: string,
    body: unknown,
  ): Promise<{ status: number; body: { staff_id: string; current_group: string } }> {
    const b = (body ?? {}) as Record<string, unknown>;
    return { status: 200, body: await this.transfer.execute({ userId, staffId, toGroup: b.to_group }) };
  }
}
