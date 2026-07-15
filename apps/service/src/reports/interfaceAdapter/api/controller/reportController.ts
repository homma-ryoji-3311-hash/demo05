import type { CreateDraftUseCase } from '../../../use-case/createDraft.js';
import type { UpdateDraftUseCase } from '../../../use-case/updateDraft.js';
import type { GetDraftUseCase } from '../../../use-case/getDraft.js';
import type { ReportEntity } from '../../../domain/model/report.js';

export interface ReportResponse {
  id: string;
  user_id: string;
  report_date: string;
  raw_text: string;
  status: string;
}

/** HTTP レスポンス形（snake_case）へ変換。acceptance は id / status / raw_text を見る。 */
function toResponse(report: ReportEntity): ReportResponse {
  const p = report.toPersistence();
  return { id: p.id, user_id: p.userId, report_date: p.reportDate, raw_text: p.rawText, status: p.status };
}

/** HTTP ⇔ ユースケースの変換のみ。Express の Request/Response には依存しない。 */
export class ReportController {
  constructor(
    private readonly createDraft: CreateDraftUseCase,
    private readonly updateDraft: UpdateDraftUseCase,
    private readonly getDraft: GetDraftUseCase,
  ) {}

  /** S3 の下書き復元。現在の下書きがあれば返し、無ければ { draft: null }。 */
  async draft(userId: string): Promise<{ status: number; body: ReportResponse | { draft: null } }> {
    const report = await this.getDraft.execute({ userId });
    return { status: 200, body: report ? toResponse(report) : { draft: null } };
  }

  async create(userId: string, body: unknown): Promise<{ status: number; body: ReportResponse }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const report = await this.createDraft.execute({ userId, reportDate: b.report_date, rawText: b.raw_text });
    return { status: 201, body: toResponse(report) };
  }

  async update(userId: string, id: string, body: unknown): Promise<{ status: number; body: ReportResponse }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const report = await this.updateDraft.execute({ userId, id, rawText: b.raw_text });
    return { status: 200, body: toResponse(report) };
  }
}
