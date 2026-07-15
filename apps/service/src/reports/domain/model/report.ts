import { ReportValidationError } from '../error/reportErrors.js';

export type ReportStatus = 'draft' | 'confirmed';

/** AI 要約の固定スキーマ（4カテゴリ・提供元非依存）。slice-02/03 で使う。 */
export interface StructuredSummary {
  incidents: string[];
  achievements: string[];
  issues: string[];
  skills: string[];
}

/** 永続化・復元用のプレーン表現（camelCase）。HTTP レスポンス形はコントローラで snake_case に変換する。 */
export interface ReportProps {
  id: string;
  userId: string;
  reportDate: string;
  rawText: string;
  status: ReportStatus;
  aiSummaryJson: StructuredSummary | null;
  confirmedSummary: StructuredSummary | null;
}

/**
 * 業務報告エンティティ。
 * slice-01 スコープ: 下書き作成・本文更新・確定後不変の土台。
 * slice-02: AI 要約(aiSummaryJson)、slice-03: 確定(confirmedSummary/status=confirmed) を足す。
 */
export class ReportEntity {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _reportDate: string,
    private _rawText: string,
    private _status: ReportStatus,
    private _aiSummaryJson: StructuredSummary | null,
    private _confirmedSummary: StructuredSummary | null,
  ) {}

  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get reportDate(): string {
    return this._reportDate;
  }
  get rawText(): string {
    return this._rawText;
  }
  get status(): ReportStatus {
    return this._status;
  }
  get aiSummaryJson(): StructuredSummary | null {
    return this._aiSummaryJson;
  }
  get confirmedSummary(): StructuredSummary | null {
    return this._confirmedSummary;
  }

  /** 新規下書き。report_date のビジネスルール（必須）を検証する。 */
  static createDraft(params: { id: string; userId: string; reportDate: unknown; rawText?: unknown }): ReportEntity {
    if (typeof params.reportDate !== 'string' || params.reportDate.trim() === '') {
      throw new ReportValidationError('report_date is required');
    }
    const rawText = typeof params.rawText === 'string' ? params.rawText : '';
    return new ReportEntity(params.id, params.userId, params.reportDate, rawText, 'draft', null, null);
  }

  /** 永続化層からの復元（検証済みデータの再構築）。 */
  static reconstruct(props: ReportProps): ReportEntity {
    return new ReportEntity(
      props.id,
      props.userId,
      props.reportDate,
      props.rawText,
      props.status,
      props.aiSummaryJson,
      props.confirmedSummary,
    );
  }

  isConfirmed(): boolean {
    return this._status === 'confirmed';
  }

  /** 下書き本文の更新（確定後不変の判定は use-case が担う）。 */
  updateRawText(rawText: string): void {
    this._rawText = rawText;
  }

  /** slice-02: AI 要約結果を保存する（下書き段階で行う）。 */
  applySummary(summary: StructuredSummary): void {
    this._aiSummaryJson = summary;
  }

  /** slice-03: 確定要約を保存し status=confirmed にする（確定後不変・二重確定判定は use-case）。 */
  confirm(summary: StructuredSummary): void {
    this._confirmedSummary = summary;
    this._status = 'confirmed';
  }

  toPersistence(): ReportProps {
    return {
      id: this._id,
      userId: this._userId,
      reportDate: this._reportDate,
      rawText: this._rawText,
      status: this._status,
      aiSummaryJson: this._aiSummaryJson,
      confirmedSummary: this._confirmedSummary,
    };
  }
}
