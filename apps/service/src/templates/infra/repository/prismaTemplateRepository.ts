import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import { TemplatePersistenceUnavailableError, type TemplateEntity } from '../../domain/model/template.js';
import type { TemplateRepositoryInterface } from '../../domain/interface/templateRepository.js';

/**
 * 本番の Prisma 実装（slice-10 スコープ）。
 * schema.prisma への Template モデル追加とマイグレーションの実行は統合役（CLAUDE.md §1-2・層境ゲート）。
 * 本スライスではスキーマ変更・マイグレーションが禁止のため、モデル追加までは未配線（ドメインエラーで明示）。
 * ローカル/CI の緑検証は InMemoryTemplateRepository（PERSISTENCE=memory）で行い、main.ts の本番配線も後続。
 * インターフェースを満たすことで、Template モデル追加後はメソッド本体を差し替えるだけで本番接続できる。
 */
export class PrismaTemplateRepository implements TemplateRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async save(_template: TemplateEntity): Promise<void> {
    void this.prisma;
    throw new TemplatePersistenceUnavailableError('save');
  }

  async findById(_id: string): Promise<TemplateEntity | null> {
    void this.prisma;
    throw new TemplatePersistenceUnavailableError('findById');
  }

  async findByGroup(_groupId: string): Promise<TemplateEntity[]> {
    void this.prisma;
    throw new TemplatePersistenceUnavailableError('findByGroup');
  }
}
