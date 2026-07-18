import { describe, expect, it } from 'vitest';
import { ConfirmReportUseCase } from '../../reports/use-case/confirmReport.js';
import { InMemoryReportRepository } from '../../reports/infra/repository/inMemoryReportRepository.js';
import { ReportEntity, type StructuredSummary } from '../../reports/domain/model/report.js';
import { ReportValidationError } from '../../reports/domain/error/reportErrors.js';

/** #45: confirm に summary を渡さないとき、要約済み(ai_summary_json)へフォールバックして確定する（oracle 準拠）。 */
const AI_SUMMARY: StructuredSummary = { incidents: [], achievements: ['要約済み'], issues: [], skills: [] };

async function repoWithSummarizedDraft(): Promise<InMemoryReportRepository> {
  const repo = new InMemoryReportRepository();
  const draft = ReportEntity.createDraft({ id: 'r1', userId: 'u', reportDate: '2026-07-15', rawText: '本文' });
  draft.applySummary(AI_SUMMARY); // summarize 済み相当
  await repo.save(draft);
  return repo;
}

describe('ConfirmReportUseCase summary フォールバック (#45 / slice-03 fix-forward)', () => {
  it('summary 省略時は ai_summary_json で確定する（oracle と HTTP 等価）', async () => {
    const repo = await repoWithSummarizedDraft();
    const report = await new ConfirmReportUseCase(repo).execute({ userId: 'u', id: 'r1', summary: undefined });
    expect(report.status).toBe('confirmed');
    expect(report.toPersistence().confirmedSummary).toEqual(AI_SUMMARY);
  });

  it('summary を渡せば従来どおりその編集値で確定する（既存挙動は不変）', async () => {
    const repo = await repoWithSummarizedDraft();
    const edited: StructuredSummary = { incidents: ['a'], achievements: [], issues: [], skills: [] };
    const report = await new ConfirmReportUseCase(repo).execute({ userId: 'u', id: 'r1', summary: edited });
    expect(report.toPersistence().confirmedSummary).toEqual(edited);
  });

  it('未要約かつ summary 省略なら確定できない（422 相当の ReportValidationError）', async () => {
    const repo = new InMemoryReportRepository();
    await repo.save(ReportEntity.createDraft({ id: 'r2', userId: 'u', reportDate: '2026-07-15', rawText: '本文' }));
    await expect(
      new ConfirmReportUseCase(repo).execute({ userId: 'u', id: 'r2', summary: undefined }),
    ).rejects.toBeInstanceOf(ReportValidationError);
  });
});
