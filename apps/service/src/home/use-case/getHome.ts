import type { ReportSummaryReaderInterface } from '../domain/interface/reportSummaryReader.js';

/** S2 ホームの今日の報告状況（PM決定 Option A: report_date は無視して集約＝日付非依存）。 */
export type TodayStatus = 'none' | 'draft_exists' | 'confirmed';

export interface HomeView {
  todayStatus: TodayStatus;
  /** 下書きがあればその id。無ければ null（未確定下書きへの導線に使う）。 */
  draftId: string | null;
}

/**
 * ホーム集約（slice-07 AC-1）。read 専用ポート経由でのみ reports を参照する。
 * 集約規則はオラクル（reference-mock /home）と等価:
 *   下書きあり → draft_exists ／ 無く確定済みあり → confirmed ／ どちらも無し → none。
 */
export class GetHomeUseCase {
  constructor(private readonly reader: ReportSummaryReaderInterface) {}

  async execute(input: { userId: string }): Promise<HomeView> {
    const draft = await this.reader.findDraftByUser(input.userId);
    if (draft) {
      return { todayStatus: 'draft_exists', draftId: draft.id };
    }
    const all = await this.reader.findAllByUser(input.userId);
    const todayStatus: TodayStatus = all.some((r) => r.status === 'confirmed') ? 'confirmed' : 'none';
    return { todayStatus, draftId: null };
  }
}
