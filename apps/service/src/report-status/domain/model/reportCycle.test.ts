import { describe, expect, it } from 'vitest';
import { REPORT_CYCLES, ReportCycle, ReportCycleValidationError } from './reportCycle.js';

describe('ReportCycle.create（サイクル設定・AC-1）', () => {
  it.each(REPORT_CYCLES)('有効なサイクル %s を受け付ける', (cycle) => {
    const view = ReportCycle.create({ staffId: 'staff01', cycle, deadlineLocal: '18:00' }).toView();
    expect(view).toEqual({ staff_id: 'staff01', cycle, deadline_local: '18:00' });
  });

  it('deadlineLocal を指定すればそのまま保持する', () => {
    const view = ReportCycle.create({ staffId: 'staff02', cycle: 'weekly', deadlineLocal: '09:30' }).toView();
    expect(view.deadline_local).toBe('09:30');
  });

  it('deadlineLocal が文字列でなければ既定 18:00 を使う', () => {
    const view = ReportCycle.create({ staffId: 'staff03', cycle: 'monthly', deadlineLocal: undefined }).toView();
    expect(view.deadline_local).toBe('18:00');
  });

  it('不正なサイクルは ReportCycleValidationError（kind=validation → 422・保存しない）', () => {
    expect(() => ReportCycle.create({ staffId: 'staff01', cycle: 'yearly', deadlineLocal: '18:00' })).toThrow(
      ReportCycleValidationError,
    );
  });

  it('サイクルが文字列でない場合も 422', () => {
    expect(() => ReportCycle.create({ staffId: 'staff01', cycle: 42, deadlineLocal: '18:00' })).toThrow(
      ReportCycleValidationError,
    );
  });

  it('ReportCycleValidationError は kind=validation を持つ', () => {
    let caught: unknown;
    try {
      ReportCycle.create({ staffId: 'staff01', cycle: 'nope', deadlineLocal: '18:00' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ReportCycleValidationError);
    expect((caught as ReportCycleValidationError).kind).toBe('validation');
  });
});

describe('ReportCycle.reconstruct', () => {
  it('永続化 props から復元し toView/toPersistence が往復する', () => {
    const propsIn = { staffId: 'staff09', cycle: 'biweekly' as const, deadlineLocal: '12:00' };
    const cycle = ReportCycle.reconstruct(propsIn);
    expect(cycle.staffId).toBe('staff09');
    expect(cycle.toPersistence()).toEqual(propsIn);
  });
});
