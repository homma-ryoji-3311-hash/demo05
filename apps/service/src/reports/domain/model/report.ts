import { ReportValidationError } from '../error/reportErrors.js';

export type ReportStatus = 'draft' | 'confirmed';

/** 永続化・復元用のプレーン表現（camelCase）。HTTP レスポンス形はコントローラで snake_case に変換する。 */
export interface ReportProps {
  id: string;
  userId: string;
  reportDate: string;
  rawText: string;
  status: ReportStatus;
}

/**
 * 業務報告エンティティ。
 * slice-01 スコープ: 下書き作成・本文更新・確定後不変の土台。
 * 要約(slice-02)・確定(slice-03) は後続スライスで足す。
 */
export class ReportEntity {
  private constructor(
    private readonly _id: string,
    private readonly _userId: string,
    private readonly _reportDate: string,
    private _rawText: string,
    private readonly _status: ReportStatus,
  ) {}

  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get status(): ReportStatus {
    return this._status;
  }

  /** 新規下書き。report_date のビジネスルール（必須）を検証する。 */
  static createDraft(params: { id: string; userId: string; reportDate: unknown; rawText?: unknown }): ReportEntity {
    if (typeof params.reportDate !== 'string' || params.reportDate.trim() === '') {
      throw new ReportValidationError('report_date is required');
    }
    const rawText = typeof params.rawText === 'string' ? params.rawText : '';
    return new ReportEntity(params.id, params.userId, params.reportDate, rawText, 'draft');
  }

  /** 永続化層からの復元（検証済みデータの再構築）。 */
  static reconstruct(props: ReportProps): ReportEntity {
    return new ReportEntity(props.id, props.userId, props.reportDate, props.rawText, props.status);
  }

  isConfirmed(): boolean {
    return this._status === 'confirmed';
  }

  /** 下書き本文の更新（確定後不変の判定は use-case が担う）。 */
  updateRawText(rawText: string): void {
    this._rawText = rawText;
  }

  toPersistence(): ReportProps {
    return {
      id: this._id,
      userId: this._userId,
      reportDate: this._reportDate,
      rawText: this._rawText,
      status: this._status,
    };
  }
}
