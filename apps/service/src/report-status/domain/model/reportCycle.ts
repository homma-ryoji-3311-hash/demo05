import type { DomainError } from '../../../common/error/domainError.js';

/** 報告サイクル種別（固定時刻型の締切のみ対象・オラクル REPORT_CYCLES と同一）。退勤連動は slice-24。 */
export const REPORT_CYCLES = ['daily', 'weekly', 'biweekly', 'monthly'] as const;
export type CycleType = (typeof REPORT_CYCLES)[number];

export interface ReportCycleProps {
  staffId: string;
  cycle: CycleType;
  deadlineLocal: string;
}

/** HTTP レスポンス形（snake_case・オラクルと同一キー）。 */
export interface ReportCycleView {
  staff_id: string;
  cycle: string;
  deadline_local: string;
}

/** スタッフの報告サイクル（slice-15 AC-1）。不正なサイクルは 422。締切はローカル時刻（固定時刻型）。 */
export class ReportCycle {
  private constructor(private props: ReportCycleProps) {}

  static create(params: { staffId: string; cycle: unknown; deadlineLocal: unknown }): ReportCycle {
    if (typeof params.cycle !== 'string' || !(REPORT_CYCLES as readonly string[]).includes(params.cycle)) {
      throw new ReportCycleValidationError(`invalid cycle: ${String(params.cycle)}`);
    }
    const deadlineLocal = typeof params.deadlineLocal === 'string' ? params.deadlineLocal : '18:00';
    return new ReportCycle({ staffId: params.staffId, cycle: params.cycle as CycleType, deadlineLocal });
  }

  static reconstruct(props: ReportCycleProps): ReportCycle {
    return new ReportCycle(props);
  }

  get staffId(): string {
    return this.props.staffId;
  }

  toView(): ReportCycleView {
    return { staff_id: this.props.staffId, cycle: this.props.cycle, deadline_local: this.props.deadlineLocal };
  }

  toPersistence(): ReportCycleProps {
    return { ...this.props };
  }
}

/** 不正なサイクルなど入力検証の失敗。kind=validation → 422（保存しない）。 */
export class ReportCycleValidationError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ReportCycleValidationError';
  }
}
