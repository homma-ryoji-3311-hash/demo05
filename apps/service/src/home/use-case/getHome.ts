import type { ReportSummaryReader } from '../domain/interface/reportSummaryReader.js';

export type TodayStatus = 'draft_exists' | 'confirmed' | 'none';

/** ホーム集約のレスポンス形（slice-07・オラクルと同一）。 */
export interface HomeView {
  today_status: TodayStatus;
  draft: { id: string } | null;
  links: { new_report: string; drafts: string | null };
}

/**
 * S2 ホームの集約（slice-07）。自分の報告から今日の状況と導線を組み立てる。
 * 下書きがあれば draft_exists、なければ確定があれば confirmed、どちらも無ければ none。
 */
export class GetHomeUseCase {
  constructor(private readonly reports: ReportSummaryReader) {}

  async execute(input: { userId: string }): Promise<HomeView> {
    const mine = await this.reports.findByUser(input.userId);
    const draft = mine.find((r) => r.status === 'draft') ?? null;
    const today_status: TodayStatus = draft
      ? 'draft_exists'
      : mine.some((r) => r.status === 'confirmed')
        ? 'confirmed'
        : 'none';
    return {
      today_status,
      draft: draft ? { id: draft.id } : null,
      links: { new_report: '/reports/new', drafts: draft ? `/reports/${draft.id}` : null },
    };
  }
}
