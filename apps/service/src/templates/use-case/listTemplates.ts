import { TemplateForbiddenError, type TemplateEntity } from '../domain/model/template.js';
import type { TemplateRepositoryInterface } from '../domain/interface/templateRepository.js';
import type { UserContextReaderInterface } from '../domain/interface/userContextReader.js';

/**
 * 自グループの版一覧（slice-10 AC-3/UI）。生成日時の新しい順・履歴込み・有効版フラグつき。
 * 認可: manager のみ（staff/未登録は 403）。並び順は repository が担う（オラクル server.mjs:305-307 と等価）。
 */
export class ListTemplatesUseCase {
  constructor(
    private readonly repo: TemplateRepositoryInterface,
    private readonly userContext: UserContextReaderInterface,
  ) {}

  async execute(input: { userId: string }): Promise<TemplateEntity[]> {
    const ctx = await this.userContext.findByUser(input.userId);
    if (!ctx || ctx.role !== 'manager') throw new TemplateForbiddenError();
    return this.repo.findByGroup(ctx.groupId ?? '');
  }
}
