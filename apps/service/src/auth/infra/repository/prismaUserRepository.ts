import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import { UserEntity } from '../../domain/model/user.js';
import type { UserRepositoryInterface } from '../../domain/interface/userRepository.js';

/**
 * 本番の Prisma 実装。スキーマ（prisma/schema.prisma の User）は既存。
 * マイグレーションの実行は統合役（CLAUDE.md §1-2）。ローカルの緑検証は InMemoryUserRepository で行う。
 */
export class PrismaUserRepository implements UserRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    return u ? UserEntity.reconstruct(u) : null;
  }

  async save(user: UserEntity): Promise<void> {
    const p = user.toPersistence();
    await this.prisma.user.upsert({
      where: { id: p.id },
      create: { id: p.id, email: p.email, name: p.name, role: p.role },
      update: { email: p.email, name: p.name, role: p.role },
    });
  }
}
