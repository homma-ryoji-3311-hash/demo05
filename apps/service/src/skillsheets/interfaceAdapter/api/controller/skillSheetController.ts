import type { GenerateSkillSheetUseCase } from '../../../use-case/generateSkillSheet.js';
import type { ListSkillSheetsUseCase } from '../../../use-case/listSkillSheets.js';
import type { GetSkillSheetForDownloadUseCase } from '../../../use-case/getSkillSheetForDownload.js';
import type { GetSkillSheetPreviewUseCase } from '../../../use-case/getSkillSheetPreview.js';
import type { BulkGenerateSkillSheetsUseCase } from '../../../use-case/bulkGenerateSkillSheets.js';
import type { BulkResult } from '../../../domain/model/bulkManifest.js';
import type { SkillSheetContent, SkillSheetEntity } from '../../../domain/model/skillSheet.js';

/** HTML レスポンス形。route が content-type を text/html にして送出する。 */
export interface HtmlResponse {
  status: number;
  html: string;
}

/** HTTP レスポンス形（snake_case）。オラクル(server.mjs:236)と同一キー。 */
export interface SkillSheetResponse {
  id: string;
  staff_id: string;
  filename: string;
  file_url: string;
  created_at: string;
  content: SkillSheetContent;
}

/** ダウンロードのレスポンス（元 xlsx の署名付き URL ＋ 元のファイル名）。オラクル server.mjs:255。 */
export interface DownloadResponse {
  file_url: string;
  filename: string;
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
 * 生成済みシートの content を HTML プレビューへ変換（PM決定＝HTML・元 xlsx は渡さない）。
 * オラクル(server.mjs:101-108 renderPreviewHtml)と HTTP 等価。content は合成データのみ（外部入力なし）。
 */
function renderPreviewHtml(sheet: SkillSheetEntity): string {
  const p = sheet.toPersistence();
  const li = (arr: string[]): string => arr.map((x) => `<li>${x}</li>`).join('');
  return (
    `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${p.filename}</title>` +
    `<section><h1>${p.filename}</h1>` +
    `<h2>職務経歴</h2><ul>${li(p.content.career_summary ?? [])}</ul>` +
    `<h2>スキル</h2><ul>${li(p.content.skills ?? [])}</ul></section></html>`
  );
}

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-08 生成／slice-09 一覧・DL・プレビュー）。
 * Express の Request/Response には依存しない（戻り値を route が送出する）。
 * 認可（他人403・無し404）は use-case、未認証401 は route の authUserId が担う。
 */
export class SkillSheetController {
  constructor(
    private readonly generateSkillSheet: GenerateSkillSheetUseCase,
    private readonly listSkillSheets: ListSkillSheetsUseCase,
    private readonly getSkillSheetForDownload: GetSkillSheetForDownloadUseCase,
    private readonly getSkillSheetPreview: GetSkillSheetPreviewUseCase,
    private readonly bulkGenerate: BulkGenerateSkillSheetsUseCase,
  ) {}

  /**
   * 一括生成（slice-21・manager のみ）。客先/部署/グループで絞り込み、entries/skipped/manifest（ZIP 構造）を返す。
   * staff は use-case が 403（AC-3）。
   */
  async bulk(userId: string, body: unknown): Promise<{ status: number; body: BulkResult }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const result = await this.bulkGenerate.execute({ userId, client: b.client, dept: b.dept, group: b.group });
    return { status: 200, body: result };
  }

  async create(userId: string, body: unknown): Promise<{ status: number; body: SkillSheetResponse }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const sheet = await this.generateSkillSheet.execute({ userId, staffId: b.staff_id });
    return { status: 201, body: toResponse(sheet) };
  }

  /** 自分の生成済み一覧（slice-09 AC-1）。生成日時の新しい順・履歴込み・他人は混ざらない。 */
  async list(userId: string): Promise<{ status: number; body: { sheets: SkillSheetResponse[] } }> {
    const sheets = await this.listSkillSheets.execute({ userId });
    return { status: 200, body: { sheets: sheets.map(toResponse) } };
  }

  /** ダウンロード（slice-09 AC-2）。元 xlsx の署名付き URL ＋ filename。他人403・無し404 は use-case。 */
  async download(userId: string, id: string): Promise<{ status: number; body: DownloadResponse }> {
    const sheet = await this.getSkillSheetForDownload.execute({ userId, id });
    const p = sheet.toPersistence();
    return { status: 200, body: { file_url: p.fileUrl, filename: p.filename } };
  }

  /** プレビュー（slice-09 AC-5）。HTML を返す（元 xlsx は渡さない）。他人403・無し404 は use-case。 */
  async preview(userId: string, id: string): Promise<HtmlResponse> {
    const sheet = await this.getSkillSheetPreview.execute({ userId, id });
    return { status: 200, html: renderPreviewHtml(sheet) };
  }
}
