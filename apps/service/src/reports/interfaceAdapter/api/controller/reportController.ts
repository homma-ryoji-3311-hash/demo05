import type { CreateDraftUseCase } from '../../../use-case/createDraft.js';
import type { UpdateDraftUseCase } from '../../../use-case/updateDraft.js';
import type { GetDraftUseCase } from '../../../use-case/getDraft.js';
import type { SummarizeReportUseCase } from '../../../use-case/summarizeReport.js';
import type { ConfirmReportUseCase } from '../../../use-case/confirmReport.js';
import type { ListReportsUseCase } from '../../../use-case/listReports.js';
import type { LoadOwnedReportUseCase } from '../../../use-case/loadOwnedReport.js';
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

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-01: 作成・更新・下書き取得／slice-02: 要約・取得／slice-03: 確定）。
 * Express の Request/Response には依存しない（戻り値を route が送出する）。
 */
export class ReportController {
  constructor(
    private readonly createDraft: CreateDraftUseCase,
    private readonly updateDraft: UpdateDraftUseCase,
    private readonly getDraft: GetDraftUseCase,
    private readonly summarizeReport: SummarizeReportUseCase,
    private readonly confirmReport: ConfirmReportUseCase,
    private readonly listReports: ListReportsUseCase,
    private readonly loadOwnedReport: LoadOwnedReportUseCase,
  ) {}

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

  /** S3 の下書き復元。現在の下書きがあれば返し、無ければ { draft: null }。 */
  async draft(userId: string): Promise<{ status: number; body: ReportResponse | { draft: null } }> {
    const report = await this.getDraft.execute({ userId });
    return { status: 200, body: report ? toResponse(report) : { draft: null } };
  }

  /**
   * 報告1件の取得（slice-02 の要約失敗確認 ＋ slice-04 AC-2 の詳細）。
   * 所有者境界は loadOwnedReport が持つ＝他人の報告は 403（AC-3）。
   */
  async get(userId: string, id: string): Promise<{ status: number; body: ReportResponse }> {
    const report = await this.loadOwnedReport.execute({ userId, id });
    return { status: 200, body: toResponse(report) };
  }

  /** 自分の報告一覧（slice-04 AC-1）。日付の新しい順。他人の報告は含まれない。 */
  async list(userId: string): Promise<{ status: number; body: { reports: ReportResponse[] } }> {
    const reports = await this.listReports.execute({ userId });
    return { status: 200, body: { reports: reports.map(toResponse) } };
  }

  /**
   * 要約（slice-02）。返すのは要約 JSON そのもの＝4キー固定（AC-2: 余剰キー禁止）。
   * report を包んで返さないのは、受け入れテストが body のキー集合を4キーと厳密比較するため。
   * 失敗（502）は use-case が投げる SummarizerFailedError を error-handler が変換する。
   */
  async summarize(userId: string, id: string): Promise<{ status: number; body: StructuredSummary }> {
    const summary = await this.summarizeReport.execute({ userId, id });
    return { status: 200, body: summary };
  }

  /**
   * 確定（slice-03）。body.summary が編集後の要約。返すのは report オブジェクト
   * （status=confirmed・confirmed_summary を受け入れテストが読む）。
   * 二重確定は use-case の ReportConfirmedError を error-handler が 409 に変換する。
   */
  async confirm(userId: string, id: string, body: unknown): Promise<{ status: number; body: ReportResponse }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const report = await this.confirmReport.execute({ userId, id, summary: b.summary });
    return { status: 200, body: toResponse(report) };
  }
}
