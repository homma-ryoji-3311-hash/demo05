import { describe, expect, it } from 'vitest';
import {
  ApprovalForbiddenError,
  AssignmentRoleValidationError,
  approveAccount,
  toView,
  type StaffAccount,
} from './staffApproval.js';

function pending(id = 'pend'): StaffAccount {
  return { id, status: 'pending', assignment: null, channel: null, cycle: null };
}

describe('approveAccount（承認・AC-2/AC-3）', () => {
  it('primary 承認で active＋担当・チャネル・サイクルを保存', () => {
    const approved = approveAccount(pending(), { assignmentRole: 'primary', channel: 'SES', cycle: 'daily' });
    expect(approved.status).toBe('active');
    expect(approved.assignment).toEqual({ role: 'primary' });
    expect(approved.channel).toBe('SES');
    expect(approved.cycle).toBe('daily');
  });

  it('secondary も受け付ける・channel/cycle 省略は null', () => {
    const approved = approveAccount(pending(), { assignmentRole: 'secondary', channel: undefined, cycle: 'weekly' });
    expect(approved.assignment).toEqual({ role: 'secondary' });
    expect(approved.channel).toBeNull();
    expect(approved.cycle).toBe('weekly');
  });

  it('不正な担当ロールは 422（AssignmentRoleValidationError・active にしない）', () => {
    expect(() => approveAccount(pending(), { assignmentRole: 'boss', channel: null, cycle: null })).toThrow(
      AssignmentRoleValidationError,
    );
  });

  it('担当ロール未指定（非文字列）も 422', () => {
    expect(() => approveAccount(pending(), { assignmentRole: undefined, channel: null, cycle: null })).toThrow(
      AssignmentRoleValidationError,
    );
  });

  it('AssignmentRoleValidationError は kind=validation', () => {
    expect(new AssignmentRoleValidationError().kind).toBe('validation');
  });

  it('ApprovalForbiddenError は kind=forbidden', () => {
    expect(new ApprovalForbiddenError().kind).toBe('forbidden');
  });
});

describe('toView', () => {
  it('オラクルと同一キー（id/status/assignment/channel/cycle）', () => {
    expect(toView(pending('p1'))).toEqual({
      id: 'p1',
      status: 'pending',
      assignment: null,
      channel: null,
      cycle: null,
    });
  });
});
