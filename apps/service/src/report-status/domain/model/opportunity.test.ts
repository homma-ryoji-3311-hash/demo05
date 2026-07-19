import { describe, expect, it } from 'vitest';
import { Opportunity, type OpportunityProps, opportunityStatus, ReportStatusForbiddenError } from './opportunity.js';

/** 既定は「締切前・未確定・フラグなし」= missing になる素の機会。各テストで1属性だけ上書きする。 */
function props(overrides: Partial<OpportunityProps> = {}): OpportunityProps {
  return {
    id: 'opp1',
    staffId: 'staff01',
    date: '2026-07-19',
    deadlineUtc: '2026-07-19T09:00:00.000Z',
    eligible: true,
    confirmedAt: null,
    flaggedMissing: false,
    absenceApproved: false,
    ...overrides,
  };
}

describe('opportunityStatus（5ステータス純関数・phase2-design §6.4）', () => {
  it('未確定・締切超過・フラグなし → missing（自動検知の中立・AC-3）', () => {
    expect(opportunityStatus(props())).toBe('missing');
  });

  it('締切前の確定 → submitted（AC-2）', () => {
    expect(opportunityStatus(props({ confirmedAt: '2026-07-19T08:59:00.000Z' }))).toBe('submitted');
  });

  it('締切ちょうどの確定 → submitted（境界は締切前扱い・<=）', () => {
    expect(opportunityStatus(props({ confirmedAt: '2026-07-19T09:00:00.000Z' }))).toBe('submitted');
  });

  it('締切後の確定 → late（AC-2）', () => {
    expect(opportunityStatus(props({ confirmedAt: '2026-07-19T09:00:00.001Z' }))).toBe('late');
  });

  it('管理者が計上 → unreported_flagged（AC-4）', () => {
    expect(opportunityStatus(props({ flaggedMissing: true }))).toBe('unreported_flagged');
  });

  it('承認済みの欠勤 → absent（AC-5）', () => {
    expect(opportunityStatus(props({ absenceApproved: true }))).toBe('absent');
  });

  describe('優先順位: 欠勤 > 報告漏れ > 提出済み/遅延提出 > 未報告', () => {
    it('欠勤は報告漏れより優先（absent が勝つ）', () => {
      expect(opportunityStatus(props({ absenceApproved: true, flaggedMissing: true }))).toBe('absent');
    });

    it('欠勤は確定より優先（提出済みでも absent）', () => {
      expect(opportunityStatus(props({ absenceApproved: true, confirmedAt: '2026-07-19T08:00:00.000Z' }))).toBe(
        'absent',
      );
    });

    it('報告漏れは確定より優先（確定済みでも計上済みなら unreported_flagged）', () => {
      expect(opportunityStatus(props({ flaggedMissing: true, confirmedAt: '2026-07-19T08:00:00.000Z' }))).toBe(
        'unreported_flagged',
      );
    });
  });
});

describe('Opportunity（機会の遷移・人間の確認を一枚かませる）', () => {
  it('flagMissing() で missing → unreported_flagged（自動でなく明示操作・AC-4）', () => {
    const opp = Opportunity.reconstruct(props());
    expect(opp.toView().status).toBe('missing');
    opp.flagMissing();
    expect(opp.toView().status).toBe('unreported_flagged');
  });

  it('approveAbsence() で absent（消去でなくステータスとして残す・AC-5）', () => {
    const opp = Opportunity.reconstruct(props());
    opp.approveAbsence();
    expect(opp.toView().status).toBe('absent');
  });

  it('toView() は snake_case キー（オラクル opportunityView と同一形）', () => {
    const view = Opportunity.reconstruct(props()).toView();
    expect(view).toEqual({
      id: 'opp1',
      staff_id: 'staff01',
      date: '2026-07-19',
      deadline_utc: '2026-07-19T09:00:00.000Z',
      status: 'missing',
    });
  });

  it('toPersistence() は元の props を複製して返す（不変性）', () => {
    const original = props();
    const restored = Opportunity.reconstruct(original).toPersistence();
    expect(restored).toEqual(original);
    expect(restored).not.toBe(original);
  });
});

describe('ReportStatusForbiddenError（本人の read-only・AC-6）', () => {
  it('kind=forbidden（403）を持つ', () => {
    expect(new ReportStatusForbiddenError().kind).toBe('forbidden');
  });
});
