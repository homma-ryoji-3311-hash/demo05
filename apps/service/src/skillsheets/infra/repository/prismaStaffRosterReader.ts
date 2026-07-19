import type { RosterStaff, StaffRosterReaderInterface } from '../../domain/interface/staffRosterReader.js';
import { StaffRosterPersistenceUnavailableError } from '../../domain/model/bulkManifest.js';

/**
 * Prisma 実装（未配線・マイグレーションは統合役／層境ゲート経由）。
 * DB スキーマ確定まで throw して「まだ使えない」を明示する（黙って空を返さない）。
 */
export class PrismaStaffRosterReader implements StaffRosterReaderInterface {
  async list(): Promise<RosterStaff[]> {
    throw new StaffRosterPersistenceUnavailableError('list');
  }
}
