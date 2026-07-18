import { describe, expect, it } from 'vitest';
import { UpdateDraftUseCase } from '../../reports/use-case/updateDraft.js';
import { InMemoryReportRepository } from '../../reports/infra/repository/inMemoryReportRepository.js';
import { ReportEntity } from '../../reports/domain/model/report.js';
import { ReportForbiddenError, ReportNotFoundError } from '../../reports/domain/error/reportErrors.js';

/** staff02 が所有する確定済み報告を 1 件持つリポジトリ（他人 → 403 の検証相手）。 */
async function repoWithOthersReport(): Promise<InMemoryReportRepository> {
  const repo = new InMemoryReportRepository();
  await repo.save(
    ReportEntity.reconstruct({
      id: 'r_other',
      userId: 'staff02',
      reportDate: '2026-07-14',
      rawText: '他スタッフの報告。',
      status: 'confirmed',
      aiSummaryJson: null,
      confirmedSummary: { incidents: [], achievements: [], issues: [], skills: [] },
    }),
  );
  return repo;
}

describe('UpdateDraftUseCase ownership (slice-06 AC-4 PATCH)', () => {
  it('他人の（確定済み）報告の更新は 409 ではなく 403（所有権を先に判定）', async () => {
    const repo = await repoWithOthersReport();
    await expect(
      new UpdateDraftUseCase(repo).execute({ userId: 'staff01', id: 'r_other', rawText: '改ざん' }),
    ).rejects.toBeInstanceOf(ReportForbiddenError);
    // 書き換えられていないこと
    const saved = await repo.findById('r_other');
    expect(saved?.rawText).toBe('他スタッフの報告。');
  });

  it('存在しない報告は所有権判定より前に 404', async () => {
    const repo = new InMemoryReportRepository();
    await expect(
      new UpdateDraftUseCase(repo).execute({ userId: 'staff01', id: 'missing', rawText: 'x' }),
    ).rejects.toBeInstanceOf(ReportNotFoundError);
  });

  it('自分の下書きは更新できる', async () => {
    const repo = await repoWithOthersReport();
    await repo.save(
      ReportEntity.reconstruct({
        id: 'r_mine',
        userId: 'staff01',
        reportDate: '2026-07-15',
        rawText: '自分の下書き。',
        status: 'draft',
        aiSummaryJson: null,
        confirmedSummary: null,
      }),
    );
    const updated = await new UpdateDraftUseCase(repo).execute({ userId: 'staff01', id: 'r_mine', rawText: '更新後' });
    expect(updated.rawText).toBe('更新後');
  });
});
