import type { CreateDraftUseCase } from '../../../use-case/createDraft.js';
import type { UpdateDraftUseCase } from '../../../use-case/updateDraft.js';
import type { GetDraftUseCase } from '../../../use-case/getDraft.js';
import type { SummarizeReportUseCase } from '../../../use-case/summarizeReport.js';
import type { ConfirmReportUseCase } from '../../../use-case/confirmReport.js';
import type { ListReportsUseCase } from '../../../use-case/listReports.js';
import type { GetReportUseCase } from '../../../use-case/getReport.js';
import type { GetPreviousReportUseCase } from '../../../use-case/getPreviousReport.js';
import type { ReportEntity, StructuredSummary } from '../../../domain/model/report.js';

export interface ReportResponse {
  id: string;
  user_id: string;
  report_date: string;
  raw_text: string;
  status: string;
  ai_summary_json: StructuredSummary | null;
  confirmed_summary: StructuredSummary | null;
}

/** HTTP レスポンス形（snake_case）へ変換。オラクルは report オブジェクトをそのまま返す。 */
function toResponse(report: ReportEntity): ReportResponse {
  const p = report.toPersistence();
  return {
    id: p.id,
    user_id: p.userId,
    report_date: p.reportDate,
    raw_text: p.rawText,
    status: p.status,
    ai_summary_json: p.aiSummaryJson,
    confirmed_summary: p.confirmedSummary,
  };
}

/** HTTP ⇔ ユースケースの変換のみ。Express の Request/Response には依存しない。 */
export class ReportController {
  constructor(
    private readonly createDraft: CreateDraftUseCase,
    private readonly updateDraft: UpdateDraftUseCase,
    private readonly getDraft: GetDraftUseCase,
    private readonly summarizeReport: SummarizeReportUseCase,
    private readonly confirmReport: ConfirmReportUseCase,
    private readonly listReports: ListReportsUseCase,
    private readonly getReport: GetReportUseCase,
    private readonly getPreviousReport: GetPreviousReportUseCase,
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

  /** slice-02: 要約結果（4カテゴリ JSON）をそのまま返す。 */
  async summarize(userId: string, id: string): Promise<{ status: number; body: StructuredSummary }> {
    const summary = await this.summarizeReport.execute({ userId, id });
    return { status: 200, body: summary };
  }

  /** slice-03: 確定。body.summary（無ければ AI 要約）で確定し report を返す。 */
  async confirm(userId: string, id: string, body: unknown): Promise<{ status: number; body: ReportResponse }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const summary = b.summary as StructuredSummary | undefined;
    const report = await this.confirmReport.execute({ userId, id, ...(summary ? { summary } : {}) });
    return { status: 200, body: toResponse(report) };
  }

  /** slice-04: 自分の報告一覧。 */
  async list(userId: string): Promise<{ status: number; body: { reports: ReportResponse[] } }> {
    const reports = await this.listReports.execute({ userId });
    return { status: 200, body: { reports: reports.map(toResponse) } };
  }

  /** slice-04: 報告詳細。 */
  async detail(userId: string, id: string): Promise<{ status: number; body: ReportResponse }> {
    const report = await this.getReport.execute({ userId, id });
    return { status: 200, body: toResponse(report) };
  }

  /** slice-05: 前回の確定報告（raw_text と summary）。無ければ previous: null。 */
  async previous(
    userId: string,
    id: string,
  ): Promise<{ status: number; body: { previous: { raw_text: string; summary: StructuredSummary | null } | null } }> {
    const prev = await this.getPreviousReport.execute({ userId, id });
    return {
      status: 200,
      body: { previous: prev ? { raw_text: prev.rawText, summary: prev.confirmedSummary } : null },
    };
  }
}
