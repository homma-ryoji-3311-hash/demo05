import type { GroupSettingRepositoryInterface } from '../domain/interface/groupSettingRepository.js';
import type { GroupManagerPolicyInterface } from '../domain/interface/groupManagerPolicy.js';
import { GroupSettingForbiddenError, GroupSettingValidationError } from '../domain/model/groupSetting.js';

/**
 * スタッフのグループ移管（slice-22 AC-5）。manager のみ。現在の所属のみ変更する。
 * 過去の確定報告スナップショットは変えない（元グループの不変履歴＝新規報告から移管先）。
 */
export class TransferStaffGroupUseCase {
  constructor(
    private readonly repo: GroupSettingRepositoryInterface,
    private readonly policy: GroupManagerPolicyInterface,
  ) {}

  async execute(input: {
    userId: string;
    staffId: string;
    toGroup: unknown;
  }): Promise<{ staff_id: string; current_group: string }> {
    if (!(await this.policy.isManager(input.userId))) throw new GroupSettingForbiddenError();
    if (typeof input.toGroup !== 'string') throw new GroupSettingValidationError('to_group');
    await this.repo.setCurrentGroup(input.staffId, input.toGroup); // 過去 snapshot は不変
    return { staff_id: input.staffId, current_group: input.toGroup };
  }
}
