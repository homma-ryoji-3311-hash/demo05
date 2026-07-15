import { UserEntity, type UserProps } from '../../domain/model/user.js';
import type { UserRepositoryInterface } from '../../domain/interface/userRepository.js';

/**
 * インメモリ実装（テストダブル）。DB なしで認証フローを検証できる。本番は PrismaUserRepository。
 */
export class InMemoryUserRepository implements UserRepositoryInterface {
  private readonly records = new Map<string, UserProps>();

  async findById(id: string): Promise<UserEntity | null> {
    const u = this.records.get(id);
    return u ? UserEntity.reconstruct(u) : null;
  }

  async save(user: UserEntity): Promise<void> {
    this.records.set(user.id, user.toPersistence());
  }
}

/**
 * dev/受け入れ用のシード（合成データのみ）。オラクル(server.mjs)の users Map と同一。
 * staff01/staff02 は許可ドメインのスタッフ。callback の upsert は「無ければ作成」なので既存は不変。
 */
export function seedUsers(repo: InMemoryUserRepository): void {
  void repo.save(
    UserEntity.reconstruct({ id: 'staff01', email: 'staff01@example.test', name: 'テスト太郎', role: 'staff' }),
  );
  void repo.save(
    UserEntity.reconstruct({ id: 'staff02', email: 'staff02@example.test', name: 'テスト花子', role: 'staff' }),
  );
}
