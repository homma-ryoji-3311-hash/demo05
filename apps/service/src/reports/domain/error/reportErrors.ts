import type { DomainError } from '../../../common/error/domainError.js';

/** report_date 欠落など入力検証の失敗。kind=validation → error-handler が 422 に変換（CLAUDE.md §6）。 */
export class ReportValidationError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ReportValidationError';
  }
}

/** 確定済み報告への変更（確定後不変）。kind=conflict → 409。 */
export class ReportConfirmedError extends Error implements DomainError {
  readonly kind = 'conflict' as const;
  constructor(id: string) {
    super(`report ${id} is already confirmed and immutable`);
    this.name = 'ReportConfirmedError';
  }
}

/**
 * 所有者でないユーザーによる報告へのアクセス（deny-by-default）。kind=forbidden → 403。
 * 内容は一切返さない（slice-04 AC-3）。存在しない報告は 404 のまま＝所有者にだけ「無い」ことを伝える。
 */
export class ReportForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor(id: string) {
    super(`report ${id} is not accessible by this user`);
    this.name = 'ReportForbiddenError';
  }
}

/** 対象の報告が存在しない。kind=not_found → 404。 */
export class ReportNotFoundError extends Error implements DomainError {
  readonly kind = 'not_found' as const;
  constructor(id: string) {
    super(`report ${id} not found`);
    this.name = 'ReportNotFoundError';
  }
}

/**
 * Summarizer 実装（プロバイダ／フェイク）が要約を返せなかった。kind=external → 502。
 * use-case はこれに限らず**あらゆる例外**を SummarizerFailedError に包む（実 SDK の生エラーも 502 にするため）。
 */
export class SummarizerUnavailableError extends Error implements DomainError {
  readonly kind = 'external' as const;
  constructor(message: string) {
    super(message);
    this.name = 'SummarizerUnavailableError';
  }
}

/** Summarizer（外部依存）の失敗。kind=external → 502。投げた時点で報告は保存しないので draft のまま残る。 */
export class SummarizerFailedError extends Error implements DomainError {
  readonly kind = 'external' as const;
  constructor(id: string, options?: { cause?: unknown }) {
    super(`summarization failed for report ${id}`, options);
    this.name = 'SummarizerFailedError';
  }
}
