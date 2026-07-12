import { GreetingDomainEntity } from '../domain/model/greeting.js';
import type { GreetingRepositoryInterface } from '../domain/interface/greetingRepository.js';

// Hello World デモの既定メッセージ
const DEFAULT_GREETING_MESSAGE = 'Hello, World!';

/**
 * あいさつを取得するユースケース
 * デモ用
 */
export class GetGreetingUseCase {
  constructor(
    private readonly greetingRepository: GreetingRepositoryInterface,
    private readonly generateId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(): Promise<GreetingDomainEntity> {
    const latest = await this.greetingRepository.findLatest();
    if (latest !== null) return latest;

    const greeting = GreetingDomainEntity.create({
      id: this.generateId(),
      message: DEFAULT_GREETING_MESSAGE,
      now: this.clock(),
    });

    await this.greetingRepository.save(greeting);

    return greeting;
  }
}
