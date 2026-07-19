import type { StaffAccountRepositoryInterface } from '../../domain/interface/staffAccountRepository.js';
import type { StaffAccount } from '../../domain/model/staffApproval.js';
import { StaffAccountPersistenceUnavailableError } from '../../domain/model/staffApproval.js';

/**
 * Prisma 実装（未配線・マイグレーションは統合役／層境ゲート経由）。
 * DB スキーマ確定まで throw して「まだ使えない」を明示する（黙って空を返さない）。
 */
export class PrismaStaffAccountRepository implements StaffAccountRepositoryInterface {
  async findById(_id: string): Promise<StaffAccount | null> {
    throw new StaffAccountPersistenceUnavailableError('findById');
  }
  async listPending(): Promise<StaffAccount[]> {
    throw new StaffAccountPersistenceUnavailableError('listPending');
  }
  async save(_account: StaffAccount): Promise<void> {
    throw new StaffAccountPersistenceUnavailableError('save');
  }
}
