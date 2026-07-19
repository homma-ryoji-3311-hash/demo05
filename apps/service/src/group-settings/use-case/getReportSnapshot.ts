import type { GroupSettingRepositoryInterface } from '../domain/interface/groupSettingRepository.js';
import { GroupSettingNotFoundError, type ReportSnapshot } from '../domain/model/groupSetting.js';

/**
 * 過去の確定報告スナップショット取得（slice-22 AC-3/AC-5）。作成時点の group/設定を read-only で返す（不変履歴）。
 * 設定変更・移管の影響を受けない（書き換え経路を持たない）。
 */
export class GetReportSnapshotUseCase {
  constructor(private readonly repo: GroupSettingRepositoryInterface) {}

  async execute(input: { reportId: string }): Promise<ReportSnapshot> {
    const snap = await this.repo.findSnapshot(input.reportId);
    if (!snap) throw new GroupSettingNotFoundError(input.reportId);
    return snap;
  }
}
