import type { SkillSheetEntity } from '../domain/model/skillSheet.js';
import type { SkillSheetRepositoryInterface } from '../domain/interface/skillSheetRepository.js';

/**
 * 自分の生成済みスキルシート一覧（slice-09 AC-1/AC-4）。生成日時の新しい順・履歴込み。
 * 所有者境界は repository.findByUser が持つ＝他人の生成物は混ざらない（deny-by-default）。
 * 並び順は repository が担う（オラクル server.mjs と HTTP 等価）。
 */
export class ListSkillSheetsUseCase {
  constructor(private readonly repo: SkillSheetRepositoryInterface) {}

  async execute(input: { userId: string }): Promise<SkillSheetEntity[]> {
    return this.repo.findByUser(input.userId);
  }
}
