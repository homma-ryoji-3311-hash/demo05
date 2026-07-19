import type { ReminderTargetReaderInterface } from '../../domain/interface/reminderTargetReader.js';
import type { ReminderTarget } from '../../domain/model/reminderRule.js';
import { ReminderPersistenceUnavailableError } from '../../domain/model/reminderRule.js';

/**
 * Prisma 実装（未配線・マイグレーションは統合役／層境ゲート経由）。
 * DB スキーマ確定まで throw して「まだ使えない」を明示する（黙って空を返さない・silent-failure 回避）。
 */
export class PrismaReminderTargetReader implements ReminderTargetReaderInterface {
  async listTargets(): Promise<ReminderTarget[]> {
    throw new ReminderPersistenceUnavailableError('listTargets');
  }
}
