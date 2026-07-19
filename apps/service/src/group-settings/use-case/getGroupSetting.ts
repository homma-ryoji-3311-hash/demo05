import type { GroupSettingRepositoryInterface } from '../domain/interface/groupSettingRepository.js';
import { GroupSettingNotFoundError, type GroupSetting } from '../domain/model/groupSetting.js';

/** グループ設定を解決して返す（slice-22 AC-1）。未設定は 404（新グループは PUT で追加・AC-2）。閲覧は認証のみ。 */
export class GetGroupSettingUseCase {
  constructor(private readonly repo: GroupSettingRepositoryInterface) {}

  async execute(input: { groupId: string }): Promise<GroupSetting> {
    const setting = await this.repo.findSetting(input.groupId);
    if (!setting) throw new GroupSettingNotFoundError(input.groupId);
    return setting;
  }
}
