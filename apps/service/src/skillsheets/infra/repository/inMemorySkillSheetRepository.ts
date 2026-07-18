import { SkillSheetEntity, type SkillSheetProps } from '../../domain/model/skillSheet.js';
import type { SkillSheetRepositoryInterface } from '../../domain/interface/skillSheetRepository.js';

/**
 * インメモリ実装（テストダブル）。SkillSheetRepositoryInterface を満たす本物の実装で、
 * DB なしで生成フローを検証できる（受け入れテストの緑検証・PERSISTENCE=memory）。
 * 再生成は新 id で save＝旧を上書きしない（非破壊・履歴の観測は slice-09）。
 * 本番は PrismaSkillSheetRepository。マイグレーションの実行は統合役（CLAUDE.md §1-2）。
 */
export class InMemorySkillSheetRepository implements SkillSheetRepositoryInterface {
  private readonly records = new Map<string, SkillSheetProps>();

  async save(sheet: SkillSheetEntity): Promise<void> {
    this.records.set(sheet.id, sheet.toPersistence());
  }

  async findById(id: string): Promise<SkillSheetEntity | null> {
    const r = this.records.get(id);
    return r ? SkillSheetEntity.reconstruct(r) : null;
  }
}
