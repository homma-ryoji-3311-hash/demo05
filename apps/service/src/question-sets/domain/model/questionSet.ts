import type { DomainError } from '../../../common/error/domainError.js';

/** 回答形式（短文/長文/選択・オラクル QUESTION_FORMATS と同一）。不正は 422。 */
export const QUESTION_FORMATS = ['short', 'long', 'select'] as const;
export type QuestionFormat = (typeof QUESTION_FORMATS)[number];

/** 役割タグ（案件キー紐づけ/ステータス/スキル抽出/内部のみ・オラクル ROLE_TAGS と同一）。不正は 422。 */
export const ROLE_TAGS = ['project_key', 'status', 'skill', 'internal_only'] as const;
export type RoleTag = (typeof ROLE_TAGS)[number];

/** 公開ガードレール: 各役割 ≥1（不足は公開拒否・AC-3・オラクル REQUIRED_PUBLISH_ROLES と同一）。 */
export const REQUIRED_PUBLISH_ROLES: RoleTag[] = ['project_key', 'skill'];

export interface Question {
  order: number;
  format: QuestionFormat;
  required: boolean;
  role_tag: RoleTag;
  text: string;
}

export type QuestionSetStatus = 'draft' | 'published';

export interface QuestionSet {
  id: string;
  group_id: string;
  version: number | null;
  status: QuestionSetStatus;
  questions: Question[];
}

/**
 * 設問の正規化＋検証（オラクル normalizeQuestions と同一）。不正な形式/役割タグがあれば null（呼び出し側で 422）。
 * order は配列位置で採番（並べ替えは配列順で表現）・required は真偽・text は文字列（既定 ''）。
 */
export function normalizeQuestions(arr: unknown): Question[] | null {
  if (!Array.isArray(arr)) return null;
  const out: Question[] = [];
  for (let i = 0; i < arr.length; i++) {
    const q = arr[i] as Record<string, unknown> | undefined;
    const format = q?.format;
    const roleTag = q?.role_tag;
    if (
      typeof format !== 'string' ||
      !(QUESTION_FORMATS as readonly string[]).includes(format) ||
      typeof roleTag !== 'string' ||
      !(ROLE_TAGS as readonly string[]).includes(roleTag)
    ) {
      return null;
    }
    out.push({
      order: i + 1,
      format: format as QuestionFormat,
      required: q?.required === true,
      role_tag: roleTag as RoleTag,
      text: typeof q?.text === 'string' ? q.text : '',
    });
  }
  return out;
}

/** 公開に不足している必須役割（オラクル missingPublishRoles と同一）。空なら公開可。 */
export function missingPublishRoles(questions: Question[]): RoleTag[] {
  return REQUIRED_PUBLISH_ROLES.filter((r) => !questions.some((q) => q.role_tag === r));
}

/** 不正な形式/役割・group_id 欠落など入力検証の失敗。kind=validation → 422。 */
export class QuestionSetValidationError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor(field: string) {
    super(`validation failed: ${field}`);
    this.name = 'QuestionSetValidationError';
  }
}

/** 対象の設問セットが存在しない。kind=not_found → 404。 */
export class QuestionSetNotFoundError extends Error implements DomainError {
  readonly kind = 'not_found' as const;
  constructor(id: string) {
    super(`question set ${id} not found`);
    this.name = 'QuestionSetNotFoundError';
  }
}

/** 設問セットの操作は manager のみ（staff は 403・AC ロール境界）。kind=forbidden → 403。 */
export class QuestionSetForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('question set operations require manager role');
    this.name = 'QuestionSetForbiddenError';
  }
}

/** Prisma 永続化が未配線（マイグレーション待ち・統合役）。kind=internal → 500。 */
export class QuestionSetPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`question-set persistence not wired: ${operation} awaits migration (統合役)`);
    this.name = 'QuestionSetPersistenceUnavailableError';
  }
}
