import type { GenerateSkillSheetUseCase } from '../../../use-case/generateSkillSheet.js';
import type { SkillSheetContent, SkillSheetEntity } from '../../../domain/model/skillSheet.js';

/** HTTP レスポンス形（snake_case）。オラクル(server.mjs:236)と同一キー。 */
export interface SkillSheetResponse {
  id: string;
  staff_id: string;
  filename: string;
  file_url: string;
  created_at: string;
  content: SkillSheetContent;
}

/** 生成物エンティティ → HTTP レスポンス形（snake_case）へ変換。 */
function toResponse(sheet: SkillSheetEntity): SkillSheetResponse {
  const p = sheet.toPersistence();
  return {
    id: p.id,
    staff_id: p.staffId,
    filename: p.filename,
    file_url: p.fileUrl,
    created_at: p.createdAt,
    content: p.content,
  };
}

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-08 生成）。
 * Express の Request/Response には依存しない（戻り値を route が送出する）。
 * 認可（他人403）は use-case、未認証401 は route の authUserId が担う。
 */
export class SkillSheetController {
  constructor(private readonly generateSkillSheet: GenerateSkillSheetUseCase) {}

  async create(userId: string, body: unknown): Promise<{ status: number; body: SkillSheetResponse }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const sheet = await this.generateSkillSheet.execute({ userId, staffId: b.staff_id });
    return { status: 201, body: toResponse(sheet) };
  }
}
