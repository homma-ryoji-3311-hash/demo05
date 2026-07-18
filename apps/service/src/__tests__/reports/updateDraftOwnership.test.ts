import { describe, expect, it } from 'vitest';
import { UpdateDraftUseCase } from '../../reports/use-case/updateDraft.js';
import { SummarizeReportUseCase } from '../../reports/use-case/summarizeReport.js';
import { ConfirmReportUseCase } from '../../reports/use-case/confirmReport.js';
import { InMemoryReportRepository } from '../../reports/infra/repository/inMemoryReportRepository.js';
import { ReportEntity, type StructuredSummary } from '../../reports/domain/model/report.js';
import type { SummarizerInterface } from '../../reports/domain/interface/summarizer.js';
import { ReportForbiddenError, ReportNotFoundError } from '../../reports/domain/error/reportErrors.js';

/** 呼ばれたら記録するだけのフェイク要約器（所有権で弾かれれば呼ばれないことを検証する）。 */
const EMPTY_SUMMARY: StructuredSummary = { incidents: [], achievements: [], issues: [], skills: [] };
class SpySummarizer implements SummarizerInterface {
  called = false;
  async summarize(): Promise<StructuredSummary> {
    this.called = true;
    return EMPTY_SUMMARY;
  }
}

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

describe('書き込み経路すべてで所有権を強制する（Audit C-7 の穴を塞ぐ）', () => {
  it('他人の報告の要約は 403（要約器を呼ばない＝ai_summary も上書きしない）', async () => {
    const repo = await repoWithOthersReport();
    const summarizer = new SpySummarizer();
    await expect(
      new SummarizeReportUseCase(repo, summarizer).execute({ userId: 'staff01', id: 'r_other' }),
    ).rejects.toBeInstanceOf(ReportForbiddenError);
    expect(summarizer.called).toBe(false); // 所有権判定は要約器呼び出しより前
  });

  it('他人の報告の確定は 403（confirmed_summary を上書きしない）', async () => {
    const repo = await repoWithOthersReport();
    await expect(
      new ConfirmReportUseCase(repo).execute({
        userId: 'staff01',
        id: 'r_other',
        summary: EMPTY_SUMMARY,
      }),
    ).rejects.toBeInstanceOf(ReportForbiddenError);
  });
});
