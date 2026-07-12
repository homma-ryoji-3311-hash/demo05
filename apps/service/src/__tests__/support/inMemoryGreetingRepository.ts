import { GreetingDomainEntity } from '../../template/domain/model/greeting.js';
import type { GreetingRepositoryInterface } from '../../template/domain/interface/greetingRepository.js';

/**
 * テスト用のインメモリ実装（テストダブル）。
 * GreetingRepository を満たす本物の実装で、vitest モックではないため
 * Integration Test のモック禁止ルールに抵触しない。DB なしで HTTP フローを検証できる。
 */
export class InMemoryGreetingRepository implements GreetingRepositoryInterface {
  private readonly records: ReturnType<GreetingDomainEntity['toJSON']>[] = [];

  async save(greeting: GreetingDomainEntity): Promise<void> {
    this.records.push(greeting.toJSON());
  }

  async findLatest(): Promise<GreetingDomainEntity | null> {
    const record = this.records.at(-1);
    return record ? GreetingDomainEntity.reconstruct(record) : null;
  }
}
