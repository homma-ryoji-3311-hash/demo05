import type { GetHomeUseCase } from '../../../use-case/getHome.js';

/** HTTP レスポンス形（snake_case）。オラクル /home と等価。 */
export interface HomeResponse {
  today_status: string;
  draft: { id: string } | null;
  links: { new_report: string; drafts: string | null };
}

/** 報告入力(S3)への導線は状態非依存で常に返す（AC-3）。 */
const NEW_REPORT_PATH = '/reports/new';

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-07）。Express の Request/Response には依存しない
 * （戻り値を route が送出する）。導線 URL の組み立てはここ（アダプタ層）で行う。
 */
export class HomeController {
  constructor(private readonly getHome: GetHomeUseCase) {}

  async home(userId: string): Promise<{ status: number; body: HomeResponse }> {
    const view = await this.getHome.execute({ userId });
    return {
      status: 200,
      body: {
        today_status: view.todayStatus,
        draft: view.draftId ? { id: view.draftId } : null,
        links: {
          new_report: NEW_REPORT_PATH,
          drafts: view.draftId ? `/reports/${view.draftId}` : null, // AC-2 未確定下書きへの導線
        },
      },
    };
  }
}
