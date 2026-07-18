import type { UploadTemplateUseCase } from '../../../use-case/uploadTemplate.js';
import type { ActivateTemplateUseCase } from '../../../use-case/activateTemplate.js';
import type { ListTemplatesUseCase } from '../../../use-case/listTemplates.js';
import type { AnchorMap, TemplateEntity } from '../../../domain/model/template.js';

/** HTTP レスポンス形（snake_case）。オラクル(server.mjs:277-287)と同一キー。 */
export interface TemplateResponse {
  id: string;
  group_id: string;
  version: string;
  anchor_map: AnchorMap;
  file_url: string;
  is_active: boolean;
  uploaded_by: string;
  created_at: string;
}

/** テンプレートエンティティ → HTTP レスポンス形（snake_case）へ変換。 */
function toResponse(template: TemplateEntity): TemplateResponse {
  const p = template.toPersistence();
  return {
    id: p.id,
    group_id: p.groupId,
    version: p.version,
    anchor_map: p.anchorMap,
    file_url: p.fileUrl,
    is_active: p.isActive,
    uploaded_by: p.uploadedBy,
    created_at: p.createdAt,
  };
}

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-10 テンプレート管理）。
 * Express の Request/Response には依存しない（戻り値を route が送出する）。
 * 認可（manager 403）は use-case、未認証401 は route の authUserId が担う。
 */
export class TemplateController {
  constructor(
    private readonly uploadTemplate: UploadTemplateUseCase,
    private readonly activateTemplate: ActivateTemplateUseCase,
    private readonly listTemplates: ListTemplatesUseCase,
  ) {}

  async upload(userId: string, body: unknown): Promise<{ status: number; body: TemplateResponse }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const template = await this.uploadTemplate.execute({ userId, anchorMap: b.anchor_map });
    return { status: 201, body: toResponse(template) };
  }

  async activate(userId: string, id: string): Promise<{ status: number; body: TemplateResponse }> {
    const template = await this.activateTemplate.execute({ userId, id });
    return { status: 200, body: toResponse(template) };
  }

  async list(userId: string): Promise<{ status: number; body: { templates: TemplateResponse[] } }> {
    const templates = await this.listTemplates.execute({ userId });
    return { status: 200, body: { templates: templates.map(toResponse) } };
  }
}
