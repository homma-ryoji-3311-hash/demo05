import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import { GreetingDomainEntity } from '../../domain/model/greeting.js';
import type { GreetingRepositoryInterface } from '../../domain/interface/greetingRepository.js';

/** デモで返す固定のあいさつ */
const DEMO_GREETING = GreetingDomainEntity.reconstruct({
  id: 'demo-greeting',
  message: 'Hello, World!',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
});

/**
 * GreetingRepository（domain/interface）の実装。
 * 本来は共通の PrismaService 経由で DB にアクセスするが、
 * この Hello World デモでは DB に接続せず固定値を返す（環境構築の動作確認用）。
 * 実際に DB を使うときはコメントの通り this.prisma.greeting.* を呼ぶ。
 */
export class GreetingRepository implements GreetingRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async save(_greeting: GreetingDomainEntity): Promise<void> {
    // デモではDB保存しない（no-op）。
    // 実際は: await this.prisma.greeting.create({ data: _greeting.toJSON() });
  }

  async findLatest(): Promise<GreetingDomainEntity | null> {
    // デモではDB接続せず固定のあいさつを返す。
    // 実際は: const record = await this.prisma.greeting.findFirst({ orderBy: { createdAt: 'desc' } });
    return DEMO_GREETING;
  }
}
