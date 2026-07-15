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

/** 対象の報告が存在しない。kind=not_found → 404。 */
export class ReportNotFoundError extends Error implements DomainError {
  readonly kind = 'not_found' as const;
  constructor(id: string) {
    super(`report ${id} not found`);
    this.name = 'ReportNotFoundError';
  }
}

/** 他人が所有する報告へのアクセス（所有権の拒否）。kind=forbidden → 403。 */
export class ReportForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor(id: string) {
    super(`report ${id} is not accessible by this user`);
    this.name = 'ReportForbiddenError';
  }
}

/** Summarizer（外部依存）の失敗。kind=external → 502。報告は下書きのまま保持される。 */
export class SummarizerUnavailableError extends Error implements DomainError {
  readonly kind = 'external' as const;
  constructor() {
    super('summarizer failed');
    this.name = 'SummarizerUnavailableError';
  }
}
