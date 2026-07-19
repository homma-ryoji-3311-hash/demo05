import type { DomainError } from '../../../common/error/domainError.js';
import type { StructuredSummary } from './report.js';

/** 追加質問の定型文（対象カテゴリ issues への一度きりの質問・slice-23）。 */
export const FOLLOWUP_QUESTION = 'issues（課題）について、具体的な内容を教えてください。';

/**
 * 薄さのルール検出（決定的・オラクル isThin と同一・slice-23）。
 * 対象カテゴリが「配列でない or 空 or 全要素が極端に短い」なら薄い。Gemini 自動判定を主役にしない（決定的が主役）。
 * しきい値・対象カテゴリは注入（slice-26 で調整可能）。
 */
export function isThin(
  summary: StructuredSummary | null,
  targetCategories: (keyof StructuredSummary)[],
  minLen: number,
): boolean {
  return targetCategories.some((c) => {
    const v = summary?.[c];
    return !Array.isArray(v) || v.length === 0 || v.every((x) => String(x ?? '').trim().length < minLen);
  });
}

/** 必須の追加質問が提示済み未回答のまま確定しようとした（AC-3）。kind=validation → 422。 */
export class FollowUpRequiredError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor() {
    super('required follow-up question is unanswered');
    this.name = 'FollowUpRequiredError';
  }
}

/** 提示済みの追加質問が無い/回答が空など（AC-2 の前提外）。kind=validation → 422。 */
export class FollowUpStateError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor(message: string) {
    super(message);
    this.name = 'FollowUpStateError';
  }
}
