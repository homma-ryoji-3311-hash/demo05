import { TemplateForbiddenError, TemplateNotFoundError, type TemplateEntity } from '../domain/model/template.js';
import type { TemplateRepositoryInterface } from '../domain/interface/templateRepository.js';
import type { UserContextReaderInterface } from '../domain/interface/userContextReader.js';

/**
 * 有効版の切替（slice-10 AC-3/AC-4）。指定版を有効にし、同一グループの旧版は削除せず is_active=false で残す（履歴）。
 * 認可: manager のみ。**認可チェックを id 参照より先に行う**＝staff の切替は存在しない id でも 403（AC-4）。
 */
export class ActivateTemplateUseCase {
  constructor(
    private readonly repo: TemplateRepositoryInterface,
    private readonly userContext: UserContextReaderInterface,
  ) {}

  async execute(input: { userId: string; id: string }): Promise<TemplateEntity> {
    const ctx = await this.userContext.findByUser(input.userId);
    if (!ctx || ctx.role !== 'manager') throw new TemplateForbiddenError(); // AC-4: staff → 403（id 参照より先）

    const target = await this.repo.findById(input.id);
    if (!target) throw new TemplateNotFoundError(input.id);

    // 同一グループ内で有効版を排他にする（旧版は削除せず is_active=false で残す・AC-3）。
    const siblings = await this.repo.findByGroup(target.groupId);
    let activated: TemplateEntity = target;
    for (const s of siblings) {
      if (s.id === input.id) {
        s.activate();
        activated = s;
      } else {
        s.deactivate();
      }
      await this.repo.save(s);
    }
    return activated;
  }
}
