import { describe, expect, it } from 'vitest';
import { ConfirmReportUseCase } from '../../reports/use-case/confirmReport.js';
import { UpdateDraftUseCase } from '../../reports/use-case/updateDraft.js';
import { InMemoryReportRepository } from '../../reports/infra/repository/inMemoryReportRepository.js';
import { ReportEntity, type StructuredSummary } from '../../reports/domain/model/report.js';
import {
  ReportConfirmedError,
  ReportNotFoundError,
  ReportValidationError,
} from '../../reports/domain/error/reportErrors.js';

const EDITED: StructuredSummary = {
  incidents: [],
  achievements: ['改修を完了'],
  issues: ['再発防止が課題'],
  skills: ['フロントエンド'],
};

async function repoWithDraft(): Promise<InMemoryReportRepository> {
  const repo = new InMemoryReportRepository();
  await repo.save(
    ReportEntity.reconstruct({
      id: 'r1',
      userId: 'staff01',
      reportDate: '2026-07-15',
      rawText: 'ダッシュボード改修を対応。',
      status: 'draft',
      aiSummaryJson: { incidents: [], achievements: ['ダッシュボード改修を対応'], issues: [], skills: [] },
      confirmedSummary: null,
    }),
  );
  return repo;
}

describe('ConfirmReportUseCase', () => {
  it('編集後の要約を確定値として保存し、draft → confirmed に遷移する（AC-1）', async () => {
    const repo = await repoWithDraft();
    const report = await new ConfirmReportUseCase(repo).execute({ userId: 'staff01', id: 'r1', summary: EDITED });

    expect(report.status).toBe('confirmed');
    const saved = await repo.findById('r1');
    expect(saved?.status).toBe('confirmed');
    expect(saved?.toPersistence().confirmedSummary).toEqual(EDITED);
  });

  it('AI が出した要約は原文として残る＝人が編集した確定値と対比できる', async () => {
    const repo = await repoWithDraft();
    await new ConfirmReportUseCase(repo).execute({ userId: 'staff01', id: 'r1', summary: EDITED });

    const saved = await repo.findById('r1');
    expect(saved?.aiSummaryJson).toEqual({
      incidents: [],
      achievements: ['ダッシュボード改修を対応'],
      issues: [],
      skills: [],
    });
  });

  it('二重確定は ReportConfirmedError（→409）', async () => {
    const repo = await repoWithDraft();
    const useCase = new ConfirmReportUseCase(repo);
    await useCase.execute({ userId: 'staff01', id: 'r1', summary: EDITED });

    await expect(useCase.execute({ userId: 'staff01', id: 'r1', summary: EDITED })).rejects.toBeInstanceOf(
      ReportConfirmedError,
    );
  });

  it('確定後の本文更新は ReportConfirmedError（→409）＝確定後不変（AC-2）', async () => {
    const repo = await repoWithDraft();
    await new ConfirmReportUseCase(repo).execute({ userId: 'staff01', id: 'r1', summary: EDITED });

    await expect(
      new UpdateDraftUseCase(repo).execute({ userId: 'staff01', id: 'r1', rawText: '書き換え' }),
    ).rejects.toBeInstanceOf(ReportConfirmedError);

    const saved = await repo.findById('r1');
    expect(saved?.rawText).toBe('ダッシュボード改修を対応。'); // 確定時点の内容が保持される
  });

  it('存在しない報告は ReportNotFoundError（→404）', async () => {
    const repo = new InMemoryReportRepository();
    await expect(
      new ConfirmReportUseCase(repo).execute({ userId: 'staff01', id: 'missing', summary: EDITED }),
    ).rejects.toBeInstanceOf(ReportNotFoundError);
  });
});

describe('ReportEntity.confirm — 確定要約の形', () => {
  it('summary が無ければ ReportValidationError（→422）で、報告は draft のまま', async () => {
    const repo = await repoWithDraft();
    await expect(
      new ConfirmReportUseCase(repo).execute({ userId: 'staff01', id: 'r1', summary: undefined }),
    ).rejects.toBeInstanceOf(ReportValidationError);

    const saved = await repo.findById('r1');
    expect(saved?.status).toBe('draft'); // 検証に落ちた確定は保存しない
  });

  it('カテゴリが配列でなければ ReportValidationError（→422）', async () => {
    const repo = await repoWithDraft();
    await expect(
      new ConfirmReportUseCase(repo).execute({
        userId: 'staff01',
        id: 'r1',
        summary: { ...EDITED, issues: '課題' },
      }),
    ).rejects.toBeInstanceOf(ReportValidationError);
  });

  it('4カテゴリだけを取り込む（余剰キーを持ち込まない）', async () => {
    const repo = await repoWithDraft();
    await new ConfirmReportUseCase(repo).execute({
      userId: 'staff01',
      id: 'r1',
      summary: { ...EDITED, provider: 'gemini' },
    });

    const saved = await repo.findById('r1');
    expect(Object.keys(saved?.toPersistence().confirmedSummary ?? {}).sort()).toEqual([
      'achievements',
      'incidents',
      'issues',
      'skills',
    ]);
  });
});
