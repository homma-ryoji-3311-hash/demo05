import type { StaffAccountRepositoryInterface } from '../../domain/interface/staffAccountRepository.js';
import type { StaffAccount } from '../../domain/model/staffApproval.js';

/** インメモリの承認状態ストア（テスト・dev）。承認は save で上書きする（deny 解除を反映）。 */
export class InMemoryStaffAccountRepository implements StaffAccountRepositoryInterface {
  private readonly records = new Map<string, StaffAccount>();

  async findById(id: string): Promise<StaffAccount | null> {
    return this.records.get(id) ?? null;
  }

  async listPending(): Promise<StaffAccount[]> {
    return [...this.records.values()].filter((a) => a.status === 'pending');
  }

  async save(account: StaffAccount): Promise<void> {
    this.records.set(account.id, account);
  }
}

/**
 * オラクル(server.mjs users の status)と同一の合成 seed（slice-17・parity）。
 * pend_ac1 は never-approve（AC-4 の一覧に必ず居る）・pend_ac2/3 は承認テスト用。既存ユーザーはレコードなし＝active 扱い。
 */
export function seedStaffAccounts(repo: InMemoryStaffAccountRepository): void {
  const pending = (id: string): StaffAccount => ({
    id,
    status: 'pending',
    assignment: null,
    channel: null,
    cycle: null,
  });
  void repo.save(pending('pend_ac1'));
  void repo.save(pending('pend_ac2'));
  void repo.save(pending('pend_ac3'));
}
