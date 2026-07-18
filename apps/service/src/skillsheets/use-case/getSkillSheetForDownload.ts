import { SkillSheetForbiddenError, type SkillSheetEntity } from '../domain/model/skillSheet.js';
import type { DomainError } from '../../common/error/domainError.js';
import type { SkillSheetRepositoryInterface } from '../domain/interface/skillSheetRepository.js';

/**
 * 対象のスキルシートが存在しない。kind=not_found → 404（オラクル parity）。
 * domain/error/ はスライス範囲外のため、read 系の入口 use-case に co-locate する（preview からも import）。
 */
export class SkillSheetNotFoundError extends Error implements DomainError {
  readonly kind = 'not_found' as const;
  constructor(id: string) {
    super(`skill sheet ${id} not found`);
    this.name = 'SkillSheetNotFoundError';
  }
}

/**
 * ダウンロード用に所有者境界を強制してシートを1件読む（slice-09 AC-2/AC-3/AC-4）。
 * 返すのは**元の生成物**（署名付き file_url ＋ filename）。プレビュー変換ではない。
 * 他人のシートは 403（内容を一切返さない）・存在しなければ 404。所有者チェックをここ1か所に集約する。
 */
export class GetSkillSheetForDownloadUseCase {
  constructor(private readonly repo: SkillSheetRepositoryInterface) {}

  async execute(input: { userId: string; id: string }): Promise<SkillSheetEntity> {
    const sheet = await this.repo.findById(input.id);
    if (!sheet) throw new SkillSheetNotFoundError(input.id);
    if (sheet.staffId !== input.userId) throw new SkillSheetForbiddenError(input.id); // 他人 → 403
    return sheet;
  }
}
