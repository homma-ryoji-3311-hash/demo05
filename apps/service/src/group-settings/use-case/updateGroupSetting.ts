import type { GroupSettingRepositoryInterface } from '../domain/interface/groupSettingRepository.js';
import type { GroupManagerPolicyInterface } from '../domain/interface/groupManagerPolicy.js';
import { GroupSettingForbiddenError, mergeGroupSetting, type GroupSetting } from '../domain/model/groupSetting.js';

/**
 * グループ設定を編集（slice-22 AC-2/AC-3/AC-4）。担当 manager のみ（担当外/staff は 403）。
 * 部分更新をマージし effective_from=翌日を付す（設定駆動・過去報告スナップショットは不変）。
 */
export class UpdateGroupSettingUseCase {
  constructor(
    private readonly repo: GroupSettingRepositoryInterface,
    private readonly policy: GroupManagerPolicyInterface,
    private readonly clock: () => Date,
  ) {}

  async execute(input: { userId: string; groupId: string; body: unknown }): Promise<GroupSetting> {
    if (!(await this.policy.isGroupManager(input.userId, input.groupId))) throw new GroupSettingForbiddenError();
    const prev = await this.repo.findSetting(input.groupId);
    const next = mergeGroupSetting(prev, input.groupId, input.body, this.clock());
    await this.repo.saveSetting(next);
    return next;
  }
}
