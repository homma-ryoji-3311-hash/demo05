import type { DomainError } from '../../../common/error/domainError.js';

/** 担当ロール（主/副）。操作差の細部は slice-24 permission-model（ここは属性の保存まで）。 */
export const ASSIGNMENT_ROLES = ['primary', 'secondary'] as const;
export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];

/** 承認状態。新規スタッフは deny-by-default（pending）→ 承認で active（slice-17）。 */
export type AccountStatus = 'pending' | 'active';

export interface StaffAccount {
  id: string;
  status: AccountStatus;
  assignment: { role: AssignmentRole } | null;
  channel: string | null;
  cycle: string | null;
}

/** HTTP レスポンス形（オラクルと同一キー: id/status/assignment/channel/cycle）。 */
export interface StaffAccountView {
  id: string;
  status: AccountStatus;
  assignment: { role: AssignmentRole } | null;
  channel: string | null;
  cycle: string | null;
}

export function toView(a: StaffAccount): StaffAccountView {
  return { id: a.id, status: a.status, assignment: a.assignment, channel: a.channel, cycle: a.cycle };
}

/**
 * 承認（slice-17 AC-2/AC-3）。担当ロールを検証（不正は 422）し、active 化＋主/副・チャネル・サイクルを保存する。
 * 主/副の「操作差」は解釈しない——属性として保存するだけ（slice-24 の仕事）。
 */
export function approveAccount(
  account: StaffAccount,
  input: { assignmentRole: unknown; channel: unknown; cycle: unknown },
): StaffAccount {
  if (
    typeof input.assignmentRole !== 'string' ||
    !(ASSIGNMENT_ROLES as readonly string[]).includes(input.assignmentRole)
  ) {
    throw new AssignmentRoleValidationError();
  }
  return {
    ...account,
    status: 'active', // deny-by-default 解除（AC-3）
    assignment: { role: input.assignmentRole as AssignmentRole },
    channel: typeof input.channel === 'string' ? input.channel : null,
    cycle: typeof input.cycle === 'string' ? input.cycle : null,
  };
}

/** 不正な担当ロール（primary/secondary 以外）。kind=validation → 422（オラクル validation_failed と同義）。 */
export class AssignmentRoleValidationError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor() {
    super('validation failed: assignment.role');
    this.name = 'AssignmentRoleValidationError';
  }
}

/** 承認対象が存在しない。kind=not_found → 404。 */
export class StaffAccountNotFoundError extends Error implements DomainError {
  readonly kind = 'not_found' as const;
  constructor(id: string) {
    super(`staff account ${id} not found`);
    this.name = 'StaffAccountNotFoundError';
  }
}

/** 承認・承認待ち一覧は super admin のみ（AC-2/AC-4）。kind=forbidden → 403。 */
export class ApprovalForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('approval requires super admin');
    this.name = 'ApprovalForbiddenError';
  }
}

/** Prisma 永続化が未配線（マイグレーション待ち・統合役）。kind=internal → 500。 */
export class StaffAccountPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`staff-account persistence not wired: ${operation} awaits migration (統合役)`);
    this.name = 'StaffAccountPersistenceUnavailableError';
  }
}
