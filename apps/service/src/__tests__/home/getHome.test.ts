import { describe, expect, it } from 'vitest';
import { GetHomeUseCase } from '../../home/use-case/getHome.js';
import type {
  ReportSummaryReaderInterface,
  ReportSummaryView,
} from '../../home/domain/interface/reportSummaryReader.js';

/** read ポートのインメモリフェイク（reports 本体に依存せず状態分岐だけを検証する）。 */
class FakeReader implements ReportSummaryReaderInterface {
  constructor(private readonly rows: ReportSummaryView[]) {}
  async findDraftByUser(): Promise<ReportSummaryView | null> {
    return this.rows.find((r) => r.status === 'draft') ?? null;
  }
  async findAllByUser(): Promise<ReportSummaryView[]> {
    return this.rows;
  }
}

describe('GetHomeUseCase (slice-07 AC-1)', () => {
  it('下書きがあれば draft_exists＋その id を返す', async () => {
    const useCase = new GetHomeUseCase(new FakeReader([{ id: 'r_draft', status: 'draft' }]));
    expect(await useCase.execute({ userId: 'u' })).toEqual({ todayStatus: 'draft_exists', draftId: 'r_draft' });
  });

  it('下書きが無く確定済みのみなら confirmed（draftId は null）', async () => {
    const useCase = new GetHomeUseCase(new FakeReader([{ id: 'r_done', status: 'confirmed' }]));
    expect(await useCase.execute({ userId: 'u' })).toEqual({ todayStatus: 'confirmed', draftId: null });
  });

  it('報告が1件も無ければ none', async () => {
    const useCase = new GetHomeUseCase(new FakeReader([]));
    expect(await useCase.execute({ userId: 'u' })).toEqual({ todayStatus: 'none', draftId: null });
  });

  it('下書きと確定済みが混在しても下書きを優先して draft_exists', async () => {
    const useCase = new GetHomeUseCase(
      new FakeReader([
        { id: 'r_done', status: 'confirmed' },
        { id: 'r_draft', status: 'draft' },
      ]),
    );
    expect(await useCase.execute({ userId: 'u' })).toEqual({ todayStatus: 'draft_exists', draftId: 'r_draft' });
  });
});
