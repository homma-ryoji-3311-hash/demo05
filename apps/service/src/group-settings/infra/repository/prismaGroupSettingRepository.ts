import type { GroupSettingRepositoryInterface } from '../../domain/interface/groupSettingRepository.js';
import type { GroupSetting, ReportSnapshot } from '../../domain/model/groupSetting.js';
import { GroupSettingPersistenceUnavailableError } from '../../domain/model/groupSetting.js';

/**
 * Prisma 実装（未配線・マイグレーションは統合役／層境ゲート経由）。
 * DB スキーマ確定まで throw して「まだ使えない」を明示する（黙って空を返さない）。
 */
export class PrismaGroupSettingRepository implements GroupSettingRepositoryInterface {
  async findSetting(_groupId: string): Promise<GroupSetting | null> {
    throw new GroupSettingPersistenceUnavailableError('findSetting');
  }
  async saveSetting(_setting: GroupSetting): Promise<void> {
    throw new GroupSettingPersistenceUnavailableError('saveSetting');
  }
  async findSnapshot(_reportId: string): Promise<ReportSnapshot | null> {
    throw new GroupSettingPersistenceUnavailableError('findSnapshot');
  }
  async setCurrentGroup(_staffId: string, _groupId: string): Promise<void> {
    throw new GroupSettingPersistenceUnavailableError('setCurrentGroup');
  }
}
