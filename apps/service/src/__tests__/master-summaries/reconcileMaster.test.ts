import { describe, expect, it } from 'vitest';
import { ReconcileMasterUseCase } from '../../master-summaries/use-case/reconcileMaster.js';
import { InMemoryMasterSummaryRepository } from '../../master-summaries/infra/repository/inMemoryMasterSummaryRepository.js';
import { MasterSummaryEntity } from '../../master-summaries/domain/model/masterSummary.js';

function makeUseCase(): { uc: ReconcileMasterUseCase; repo: InMemoryMasterSummaryRepository } {
  const repo = new InMemoryMasterSummaryRepository();
  const uc = new ReconcileMasterUseCase(repo, () => new Date('2026-07-19T09:00:00Z'));
  return { uc, repo };
}

describe('MasterSummaryEntity.mergeIncidents', () => {
  it('key で dedup し最新 status で上書き（追記でない・AC-2）', () => {
    const merged = MasterSummaryEntity.mergeIncidents(
      [{ key: 'INC-1', status: '対応中' }],
      [{ key: 'INC-1', status: '解決' }],
    );
    expect(merged).toEqual([{ key: 'INC-1', status: '解決' }]);
  });
  it('新規 key は追加・既存は保持（増分・AC-1）', () => {
    const merged = MasterSummaryEntity.mergeIncidents(
      [{ key: 'INC-1', status: '対応中' }],
      [{ key: 'INC-2', status: '発生' }],
    );
    expect(merged.map((i) => i.key).sort()).toEqual(['INC-1', 'INC-2']);
  });
});

describe('ReconcileMasterUseCase (slice-12)', () => {
  it('AC-5: 突合結果を返す（period は report_date の YYYY-MM）', async () => {
    const { uc } = makeUseCase();
    const r = await uc.execute({
      userId: 'staff01',
      reportDate: '2026-07-10',
      projects: [{ project_id: 'p1', incidents: [{ key: 'INC-1', status: '発生' }] }],
    });
    expect(r[0]?.period).toBe('2026-07');
    expect(r[0]?.summary.incidents).toEqual([{ key: 'INC-1', status: '発生' }]);
    expect(r[0]?.reconciled_at).toBeTruthy();
  });

  it('AC-1 増分: 同一(案件,期間)の2回目は既存を保持し新報告のみマージ', async () => {
    const { uc } = makeUseCase();
    await uc.execute({
      userId: 'u',
      reportDate: '2026-07-10',
      projects: [{ project_id: 'p1', incidents: [{ key: 'INC-1', status: '対応中' }] }],
    });
    const r = await uc.execute({
      userId: 'u',
      reportDate: '2026-07-20',
      projects: [{ project_id: 'p1', incidents: [{ key: 'INC-2', status: '発生' }] }],
    });
    const keys = r[0]!.summary.incidents.map((i) => i.key).sort();
    expect(keys).toEqual(['INC-1', 'INC-2']); // 既存 INC-1 保持＋新 INC-2
  });

  it('AC-4 冪等: 同一(user,project,period)は重複行を作らず summary 不変', async () => {
    const { uc, repo } = makeUseCase();
    const a = await uc.execute({
      userId: 'u',
      reportDate: '2026-07-10',
      projects: [{ project_id: 'p1', incidents: [{ key: 'INC-1', status: '解決' }] }],
    });
    const b = await uc.execute({
      userId: 'u',
      reportDate: '2026-07-15',
      projects: [{ project_id: 'p1', incidents: [{ key: 'INC-1', status: '解決' }] }],
    });
    expect(b[0]?.summary.incidents).toEqual(a[0]?.summary.incidents); // 冪等
    const row = await repo.find('u', 'p1', '2026-07');
    expect(row?.incidents).toEqual([{ key: 'INC-1', status: '解決' }]); // 1行・重複なし
  });

  it('key 省略時は位置キー（INC-n）で1件', async () => {
    const { uc } = makeUseCase();
    const r = await uc.execute({
      userId: 'u',
      reportDate: '2026-07-10',
      projects: [{ project_id: 'p1', incidents: [{ status: '発生' }] }],
    });
    expect(r[0]?.summary.incidents).toEqual([{ key: 'INC-1', status: '発生' }]);
  });
});
