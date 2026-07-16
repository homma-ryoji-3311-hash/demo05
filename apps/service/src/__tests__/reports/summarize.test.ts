import { describe, expect, it } from 'vitest';
import { FakeSummarizer } from '../../reports/infra/summarizer/fakeSummarizer.js';
import { SummarizeReportUseCase } from '../../reports/use-case/summarizeReport.js';
import { InMemoryReportRepository } from '../../reports/infra/repository/inMemoryReportRepository.js';
import { ReportEntity, type StructuredSummary } from '../../reports/domain/model/report.js';
import { ReportNotFoundError, SummarizerFailedError } from '../../reports/domain/error/reportErrors.js';
import type { SummarizerInterface } from '../../reports/domain/interface/summarizer.js';

const KEYS = ['incidents', 'achievements', 'issues', 'skills'] as const;

async function repoWithDraft(rawText: string): Promise<InMemoryReportRepository> {
  const repo = new InMemoryReportRepository();
  await repo.save(
    ReportEntity.reconstruct({
      id: 'r1',
      userId: 'staff01',
      reportDate: '2026-07-15',
      rawText,
      status: 'draft',
      aiSummaryJson: null,
      confirmedSummary: null,
    }),
  );
  return repo;
}

describe('FakeSummarizer', () => {
  it('出力は4キーのみ（提供元名などの余剰キーを混ぜない）', async () => {
    const summary = await new FakeSummarizer().summarize('ダッシュボード改修を対応。');
    expect(Object.keys(summary).sort()).toEqual([...KEYS].sort());
  });

  it('本文に無い数値を創作しない（抽出のみ）', async () => {
    const summary = await new FakeSummarizer().summarize('本日はテスト整備とレビュー対応を実施。');
    const all = KEYS.flatMap((k) => summary[k]);
    expect(all.length).toBeGreaterThan(0); // 空振りで「数値なし」を満たしていないことを保証する
    for (const s of all) expect(s).not.toMatch(/\d/);
  });

  it('出力はすべて本文に現れた文字列そのもの（言い換え・補完をしない）', async () => {
    const rawText = '決済で障害が発生。復旧を対応。テストの課題が残る。';
    const summary = await new FakeSummarizer().summarize(rawText);
    for (const s of KEYS.flatMap((k) => summary[k])) expect(rawText).toContain(s);
  });

  it('該当が無いカテゴリは空配列のまま返す', async () => {
    const summary = await new FakeSummarizer().summarize('ダッシュボード改修を対応。');
    expect(summary.incidents).toEqual([]);
    expect(summary.achievements).toEqual(['ダッシュボード改修を対応']);
  });
});

describe('SummarizeReportUseCase', () => {
  it('要約結果を報告に保持し、status は draft のまま', async () => {
    const repo = await repoWithDraft('ダッシュボード改修を対応。');
    const summary = await new SummarizeReportUseCase(repo, new FakeSummarizer()).execute({
      userId: 'staff01',
      id: 'r1',
    });

    const saved = await repo.findById('r1');
    expect(saved?.aiSummaryJson).toEqual(summary);
    expect(saved?.status).toBe('draft');
  });

  it('Summarizer が失敗したら SummarizerFailedError（→502）を投げ、報告を書き換えない', async () => {
    const repo = await repoWithDraft('__FAIL__ 要約を失敗させる');
    const useCase = new SummarizeReportUseCase(repo, new FakeSummarizer());

    await expect(useCase.execute({ userId: 'staff01', id: 'r1' })).rejects.toBeInstanceOf(SummarizerFailedError);

    const saved = await repo.findById('r1');
    expect(saved?.status).toBe('draft'); // AC-4: 下書きは失われない
    expect(saved?.aiSummaryJson).toBeNull();
    expect(saved?.rawText).toBe('__FAIL__ 要約を失敗させる');
  });

  it('存在しない報告は ReportNotFoundError（→404）', async () => {
    const repo = new InMemoryReportRepository();
    const useCase = new SummarizeReportUseCase(repo, new FakeSummarizer());
    await expect(useCase.execute({ userId: 'staff01', id: 'missing' })).rejects.toBeInstanceOf(ReportNotFoundError);
  });

  it('抽象化層経由なので Summarizer を差し替えられる（提供元非依存）', async () => {
    const repo = await repoWithDraft('何らかの本文。');
    const stub: SummarizerInterface = {
      summarize: async (): Promise<StructuredSummary> => ({
        incidents: [],
        achievements: ['差し替えた実装の結果'],
        issues: [],
        skills: [],
      }),
    };

    const summary = await new SummarizeReportUseCase(repo, stub).execute({ userId: 'staff01', id: 'r1' });
    expect(summary.achievements).toEqual(['差し替えた実装の結果']);
  });
});
