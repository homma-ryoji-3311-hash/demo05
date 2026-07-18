import { describe, expect, it } from 'vitest';
import { GetPreviousReportUseCase } from '../../reports/use-case/getPreviousReport.js';
import { InMemoryReportRepository } from '../../reports/infra/repository/inMemoryReportRepository.js';
import { ReportEntity, type StructuredSummary } from '../../reports/domain/model/report.js';
import { ReportForbiddenError, ReportNotFoundError } from '../../reports/domain/error/reportErrors.js';

const SUMMARY: StructuredSummary = { incidents: [], achievements: ['整備'], issues: [], skills: [] };

function confirmed(id: string, userId: string, date: string): ReportEntity {
  return ReportEntity.reconstruct({
    id,
    userId,
    reportDate: date,
    rawText: `${id} 本文`,
    status: 'confirmed',
    aiSummaryJson: SUMMARY,
    confirmedSummary: SUMMARY,
  });
}
function draft(id: string, userId: string, date: string): ReportEntity {
  return ReportEntity.reconstruct({
    id,
    userId,
    reportDate: date,
    rawText: '下書き',
    status: 'draft',
    aiSummaryJson: null,
    confirmedSummary: null,
  });
}

describe('GetPreviousReportUseCase (slice-05)', () => {
  it('AC-1 直近の確定報告（対象を除く）を本文＋確定要約で返す', async () => {
    const repo = new InMemoryReportRepository();
    await repo.save(draft('cur', 'u', '2026-07-15')); // 対象（当日の下書き）
    await repo.save(confirmed('old', 'u', '2026-07-10'));
    await repo.save(confirmed('recent', 'u', '2026-07-13')); // これが直近
    const view = await new GetPreviousReportUseCase(repo).execute({ userId: 'u', id: 'cur' });
    expect(view).not.toBeNull();
    expect(view?.rawText).toBe('recent 本文');
    expect(view?.summary).toEqual(SUMMARY);
  });

  it('AC-2 前回の確定が無ければ null（前回なし）', async () => {
    const repo = new InMemoryReportRepository();
    await repo.save(draft('cur', 'fresh', '2026-07-15'));
    expect(await new GetPreviousReportUseCase(repo).execute({ userId: 'fresh', id: 'cur' })).toBeNull();
  });

  it('対象自身の確定は前回に含めない（id 除外）', async () => {
    const repo = new InMemoryReportRepository();
    await repo.save(confirmed('cur', 'u', '2026-07-15')); // 対象が確定でも自身は除外
    expect(await new GetPreviousReportUseCase(repo).execute({ userId: 'u', id: 'cur' })).toBeNull();
  });

  it('他人の確定は前回に含めない（所有者で絞る）', async () => {
    const repo = new InMemoryReportRepository();
    await repo.save(draft('cur', 'u', '2026-07-15'));
    await repo.save(confirmed('other', 'staff02', '2026-07-14'));
    expect(await new GetPreviousReportUseCase(repo).execute({ userId: 'u', id: 'cur' })).toBeNull();
  });

  it('対象が存在しなければ ReportNotFoundError（→404）', async () => {
    const repo = new InMemoryReportRepository();
    await expect(new GetPreviousReportUseCase(repo).execute({ userId: 'u', id: 'missing' })).rejects.toBeInstanceOf(
      ReportNotFoundError,
    );
  });

  it('他人の報告を対象にすると ReportForbiddenError（→403）', async () => {
    const repo = new InMemoryReportRepository();
    await repo.save(confirmed('cur', 'staff02', '2026-07-15'));
    await expect(new GetPreviousReportUseCase(repo).execute({ userId: 'u', id: 'cur' })).rejects.toBeInstanceOf(
      ReportForbiddenError,
    );
  });
});
