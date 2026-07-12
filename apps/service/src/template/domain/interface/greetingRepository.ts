import type { GreetingDomainEntity } from '../model/greeting.js';

/**
 * リポジトリインターフェース。実装は infra/repository/ に置き、
 * app.ts（コンポジションルート）で注入する。
 */
export interface GreetingRepositoryInterface {
  save(greeting: GreetingDomainEntity): Promise<void>;
  findLatest(): Promise<GreetingDomainEntity | null>;
}
