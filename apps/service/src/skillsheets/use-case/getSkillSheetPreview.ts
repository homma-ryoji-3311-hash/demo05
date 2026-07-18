import { SkillSheetForbiddenError, type SkillSheetEntity } from '../domain/model/skillSheet.js';
import { SkillSheetNotFoundError } from './getSkillSheetForDownload.js';
import type { SkillSheetRepositoryInterface } from '../domain/interface/skillSheetRepository.js';

/**
 * プレビュー用に所有者境界を強制してシートを1件読む（slice-09 AC-5/AC-3/AC-4）。
 * 返すのはシート本体（HTML 化はコントローラ＝表示の関心）。元 xlsx は渡さない（PM決定＝HTML）。
 * 他人のシートは 403・存在しなければ 404（download と同じ境界規則）。
 */
export class GetSkillSheetPreviewUseCase {
  constructor(private readonly repo: SkillSheetRepositoryInterface) {}

  async execute(input: { userId: string; id: string }): Promise<SkillSheetEntity> {
    const sheet = await this.repo.findById(input.id);
    if (!sheet) throw new SkillSheetNotFoundError(input.id);
    if (sheet.staffId !== input.userId) throw new SkillSheetForbiddenError(input.id); // 他人 → 403
    return sheet;
  }
}
