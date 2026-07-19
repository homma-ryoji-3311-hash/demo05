import { ReportValidationError } from '../error/reportErrors.js';

export type ReportStatus = 'draft' | 'confirmed';

/** AI 要約の固定スキーマ（4カテゴリ・提供元非依存）。slice-02/03 で書き込む。slice-01 では常に null。 */
export interface StructuredSummary {
  incidents: string[];
  achievements: string[];
  issues: string[];
  skills: string[];
}

/**
 * ソフト設問の回答（slice-20）。AI活用→スキル、課題/所感→内部非反映、雑感→AI/シート/共有から完全除外（L2）。
 * zakkan_visibility: limited=最小ロール閲覧可・private=本人のみ。スコア・診断は一切持たない（AC-4）。
 */
export interface SoftAnswers {
  ai_use: string | null;
  issue: string | null;
  shokan: string | null;
  zakkan: string | null;
  zakkan_visibility: 'limited' | 'private';
}

/** AI 追加質問の状態（slice-23）。asked=提示済み・answered=回答済み・degraded=提示できず・not_needed=薄くない。一度きり。 */
export type FollowUpState = 'none' | 'asked' | 'answered' | 'degraded' | 'not_needed';
export interface FollowUp {
  state: FollowUpState;
  /** 必須の追加質問か（必須かつ提示済み未回答なら確定ブロック・AC-3）。 */
  required?: boolean;
  question?: string;
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
  /** ソフト設問の回答（slice-20）。未回答は null。雑感は AI/シート/共有へ出さない。 */
  softAnswers?: SoftAnswers | null;
  /** AI 追加質問の状態（slice-23）。未生成は null（=none 相当）。 */
  followUp?: FollowUp | null;
}

/** 確定要約の4カテゴリ。順序はレスポンス・検証の両方で使う。 */
const SUMMARY_KEYS = ['incidents', 'achievements', 'issues', 'skills'] as const;

/** 確定要約の形（4カテゴリ・文字列配列）を検証して取り込む。崩れていれば 422（CLAUDE.md §6）。 */
function toStructuredSummary(value: unknown): StructuredSummary {
  if (typeof value !== 'object' || value === null) {
    throw new ReportValidationError('summary is required');
  }
  const src = value as Record<string, unknown>;
  const summary = {} as StructuredSummary;
  for (const key of SUMMARY_KEYS) {
    const items = src[key];
    if (!Array.isArray(items) || items.some((item) => typeof item !== 'string')) {
      throw new ReportValidationError(`summary.${key} must be an array of strings`);
    }
    summary[key] = [...(items as string[])];
  }
  return summary;
}

/**
 * 業務報告エンティティ。
 * slice-01 スコープ: 下書き作成・本文更新・確定後不変の判定まで。
 * slice-02 で要約の保持(applySummary)を追加。slice-03 で確定(confirm)を追加。
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
    private _softAnswers: SoftAnswers | null = null,
    private _followUp: FollowUp | null = null,
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
  /** ソフト設問の回答（slice-20）。雑感の閲覧・要約反映は use-case/domain が制御する。 */
  get softAnswers(): SoftAnswers | null {
    return this._softAnswers;
  }

  /** ソフト設問の回答を保存する（slice-20・本人のみ・認可は use-case が担う）。 */
  setSoftAnswers(soft: SoftAnswers): void {
    this._softAnswers = soft;
  }

  /** AI 追加質問の状態（slice-23）。一度きり・必須ブロックの判定は use-case/confirm が読む。 */
  get followUp(): FollowUp | null {
    return this._followUp;
  }

  /** AI 追加質問の状態を保存する（slice-23・確定前のみ・認可は use-case が担う）。 */
  setFollowUp(followUp: FollowUp): void {
    this._followUp = followUp;
  }

  /** 新規下書き。report_date のビジネスルール（必須）を検証する（→ 422）。 */
  static createDraft(params: { id: string; userId: string; reportDate: unknown; rawText?: unknown }): ReportEntity {
    if (typeof params.reportDate !== 'string' || params.reportDate.trim() === '') {
      throw new ReportValidationError('report_date is required');
    }
    const rawText = typeof params.rawText === 'string' ? params.rawText : '';
    return new ReportEntity(params.id, params.userId, params.reportDate, rawText, 'draft', null, null);
  }

  /** 永続化層からの復元（検証済みデータの再構築）。seed の確定済み報告もこれで作る。 */
  static reconstruct(props: ReportProps): ReportEntity {
    return new ReportEntity(
      props.id,
      props.userId,
      props.reportDate,
      props.rawText,
      props.status,
      props.aiSummaryJson,
      props.confirmedSummary,
      props.softAnswers ?? null,
      props.followUp ?? null,
    );
  }

  isConfirmed(): boolean {
    return this._status === 'confirmed';
  }

  /** 下書き本文の更新（確定後不変の判定は use-case が担う）。 */
  updateRawText(rawText: string): void {
    this._rawText = rawText;
  }

  /** 要約結果を保持する（slice-02）。status は変えない＝下書きは draft のまま（確定は slice-03 の confirm）。 */
  applySummary(summary: StructuredSummary): void {
    this._aiSummaryJson = summary;
  }

  /**
   * 編集後の要約を確定値として保存し、draft → confirmed に遷移する（slice-03 AC-1）。
   * 確定済みかどうかの判定は use-case が行う（二重確定・確定後の本文更新は 409）。
   * ai_summary_json は AI が出した原文として残す＝人が編集した確定値と対比できる。
   *
   * #45: summary を省略した確定は AI 要約（ai_summary_json）にフォールバックする。
   * answer key（reference-mock server.mjs:183 `body.summary ?? rep.ai_summary_json`）と HTTP 等価にする。
   * 要約済みでない（フォールバック先も無い）まま summary 省略なら、確定できる要約が無いので 422。
   */
  confirm(summary: unknown): void {
    const source = summary ?? this._aiSummaryJson;
    this._confirmedSummary = toStructuredSummary(source);
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
      softAnswers: this._softAnswers,
      followUp: this._followUp,
    };
  }
}
