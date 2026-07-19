import type { DomainError } from '../../../common/error/domainError.js';

/** 5 ステータス（提出済み/遅延提出/未報告/欠勤/報告漏れ）。phase2-design §6.4。 */
export type OpportunityStatus = 'submitted' | 'late' | 'missing' | 'unreported_flagged' | 'absent';

/** 報告義務の1単位（機会）。保存・復元用のプレーン表現。 */
export interface OpportunityProps {
  id: string;
  staffId: string;
  date: string;
  deadlineUtc: string;
  eligible: boolean;
  confirmedAt: string | null;
  flaggedMissing: boolean;
  absenceApproved: boolean;
}

/** HTTP レスポンス形（snake_case・オラクル opportunityView と同一キー）。 */
export interface OpportunityView {
  id: string;
  staff_id: string;
  date: string;
  deadline_utc: string;
  status: OpportunityStatus;
}

/**
 * 5 ステータスの純関数判定（phase2-design §6.4・オラクル opportunityStatus と同一）。
 * 優先: 欠勤 > 報告漏れ > 提出済み/遅延提出 > 未報告。未報告は自動検知の中立（自動で報告漏れにしない）。
 */
export function opportunityStatus(o: OpportunityProps): OpportunityStatus {
  if (o.absenceApproved) return 'absent'; // 欠勤（申告+管理者承認・AC-5）評価対象外
  if (o.flaggedMissing) return 'unreported_flagged'; // 報告漏れ（管理者が計上・AC-4）評価に効く
  if (o.confirmedAt) return o.confirmedAt <= o.deadlineUtc ? 'submitted' : 'late'; // 締切前=提出済み/後=遅延提出（AC-2）
  return 'missing'; // 締切超過・未確定＝未報告（自動検知の中立・AC-3）
}

export class Opportunity {
  constructor(private props: OpportunityProps) {}

  static reconstruct(props: OpportunityProps): Opportunity {
    return new Opportunity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get staffId(): string {
    return this.props.staffId;
  }
  get eligible(): boolean {
    return this.props.eligible;
  }

  /** 報告漏れを計上（管理者が実態確認の上・AC-4）。未報告→報告漏れは自動でなく明示操作。 */
  flagMissing(): void {
    this.props = { ...this.props, flaggedMissing: true };
  }

  /** 欠勤を承認（申告＋管理者承認・AC-5）。消去でなくステータスとして残す。 */
  approveAbsence(): void {
    this.props = { ...this.props, absenceApproved: true };
  }

  toView(): OpportunityView {
    return {
      id: this.props.id,
      staff_id: this.props.staffId,
      date: this.props.date,
      deadline_utc: this.props.deadlineUtc,
      status: opportunityStatus(this.props),
    };
  }

  toPersistence(): OpportunityProps {
    return { ...this.props };
  }
}

/** 対象の機会が存在しない。kind=not_found → 404。 */
export class OpportunityNotFoundError extends Error implements DomainError {
  readonly kind = 'not_found' as const;
  constructor(id: string) {
    super(`opportunity ${id} not found`);
    this.name = 'OpportunityNotFoundError';
  }
}

/** 報告状況の操作（計上・承認）は manager のみ（本人は read-only・AC-6）。kind=forbidden → 403。 */
export class ReportStatusForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('report status mutation requires manager role');
    this.name = 'ReportStatusForbiddenError';
  }
}

/** Prisma 永続化が未配線（マイグレーション待ち・統合役）。kind=internal → 500。 */
export class ReportStatusPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`report-status persistence not wired: ${operation} awaits migration (統合役)`);
    this.name = 'ReportStatusPersistenceUnavailableError';
  }
}
