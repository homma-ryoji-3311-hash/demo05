import { MasterSummaryEntity, type IncidentEntry } from '../domain/model/masterSummary.js';
import type { MasterSummaryRepositoryInterface } from '../domain/interface/masterSummaryRepository.js';

/** 突合結果の1行（snake_case）。オラクル server.mjs と HTTP 等価。 */
export interface MasterSummaryView {
  user_id: string;
  project_id: string;
  period: string;
  summary: { incidents: IncidentEntry[] };
  reconciled_at: string;
}

/** 突合の入力（案件ごと・incident は key つき）。project_id は紐づけ結果から与えられる。 */
export interface ReconcileProjectInput {
  project_id: string;
  incidents: { key?: string; status: string }[];
}

/**
 * 突合（slice-12 AC-1〜5）。確定に同期で走る。案件×期間で MASTER_SUMMARIES を upsert する:
 * 既存 summary に新報告のみを**増分マージ**し（全再処理でない・AC-1）、incident は `key` で dedup し
 * 最新 status に上書き（追記でない・AC-2）。`(user_id, project_id, period)` で upsert＝重複行なし・冪等（AC-4）。
 * 生報告ログ（REPORTS）には書かない（別レイヤー・AC-3）。
 */
export class ReconcileMasterUseCase {
  constructor(
    private readonly repo: MasterSummaryRepositoryInterface,
    private readonly clock: () => Date,
  ) {}

  async execute(input: {
    userId: string;
    reportDate: string;
    projects: ReconcileProjectInput[];
  }): Promise<MasterSummaryView[]> {
    const period = String(input.reportDate ?? '').slice(0, 7); // YYYY-MM（契約 Q3）
    const views: MasterSummaryView[] = [];
    for (const p of input.projects) {
      const existing = await this.repo.find(input.userId, p.project_id, period);
      const incoming: IncidentEntry[] = p.incidents.map((inc, idx) => ({
        key: inc.key ?? `INC-${idx + 1}`, // key 省略時は位置キー
        status: inc.status,
      }));
      const merged = MasterSummaryEntity.mergeIncidents(existing?.incidents ?? [], incoming);
      const entity = MasterSummaryEntity.create({
        userId: input.userId,
        projectId: p.project_id,
        period,
        incidents: merged,
        reconciledAt: this.clock().toISOString(),
      });
      await this.repo.upsert(entity); // (user_id, project_id, period) で upsert＝重複しない
      views.push(entity.toResponse());
    }
    return views;
  }
}
