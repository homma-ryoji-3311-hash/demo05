import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import { SkillSheetPersistenceUnavailableError, type SkillSheetEntity } from '../../domain/model/skillSheet.js';
import type { SkillSheetRepositoryInterface } from '../../domain/interface/skillSheetRepository.js';

/**
 * 本番の Prisma 実装（slice-08 スコープ）。
 * schema.prisma への SkillSheet モデル追加とマイグレーションの実行は統合役（CLAUDE.md §1-2・層境ゲート）。
 * 本スライスではスキーマ変更・マイグレーションが禁止のため、モデル追加までは未配線（ドメインエラーで明示）。
 * ローカル/CI の緑検証は InMemorySkillSheetRepository（PERSISTENCE=memory）で行い、main.ts の本番配線も後続。
 * インターフェースを満たすことで、SkillSheet モデル追加後はメソッド本体を差し替えるだけで本番接続できる
 * （prismaReportRepository と同型・移行時の骨格を先に用意しておく）。
 */
export class PrismaSkillSheetRepository implements SkillSheetRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async save(_sheet: SkillSheetEntity): Promise<void> {
    void this.prisma;
    throw new SkillSheetPersistenceUnavailableError('save');
  }

  async findById(_id: string): Promise<SkillSheetEntity | null> {
    void this.prisma;
    throw new SkillSheetPersistenceUnavailableError('findById');
  }
}
