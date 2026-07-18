import { TemplateEntity, TemplateForbiddenError, type AnchorMap } from '../domain/model/template.js';
import type { TemplateRepositoryInterface } from '../domain/interface/templateRepository.js';
import type { UserContextReaderInterface } from '../domain/interface/userContextReader.js';

/**
 * テンプレートのアップロード（slice-10 AC-1/AC-2/AC-4）。
 * 認可: manager のみ（staff/未登録は 403）。認可を検証（403）してからアンカー検証（422）へ進む
 * ＝オラクル(server.mjs:268-273)の順序と一致（staff かつ不正アンカーでも 403 が先）。
 * 版番号は自グループの既存版数＋1（`v{n}`）。初期は is_active=false（有効化は activate 経由）。
 */
export class UploadTemplateUseCase {
  constructor(
    private readonly repo: TemplateRepositoryInterface,
    private readonly userContext: UserContextReaderInterface,
    private readonly generateId: () => string,
    private readonly clock: () => Date,
  ) {}

  async execute(input: { userId: string; anchorMap: unknown }): Promise<TemplateEntity> {
    const ctx = await this.userContext.findByUser(input.userId);
    if (!ctx || ctx.role !== 'manager') throw new TemplateForbiddenError(); // AC-4: staff → 403

    const groupId = ctx.groupId ?? '';
    const existing = await this.repo.findByGroup(groupId);
    const version = `v${existing.length + 1}`;
    const id = this.generateId();
    const template = TemplateEntity.create({
      id,
      groupId,
      version,
      anchorMap: (input.anchorMap ?? {}) as AnchorMap,
      fileUrl: `https://synthetic-storage.test/templates/${id}?sig=synthetic`,
      uploadedBy: input.userId,
      createdAt: this.clock().toISOString(),
    }); // アンカー欠落は create が 422 を throw（有効版に登録しない・AC-2）
    await this.repo.save(template);
    return template;
  }
}
