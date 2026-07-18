import { describe, expect, it } from 'vitest';
import { LinkReportProjectsUseCase } from '../../projects/use-case/linkReportProjects.js';
import { InMemoryProjectRepository, seedProjects } from '../../projects/infra/repository/inMemoryProjectRepository.js';
import { IncidentStatusInvalidError } from '../../projects/domain/model/project.js';

function makeUseCase(): { uc: LinkReportProjectsUseCase; repo: InMemoryProjectRepository } {
  const repo = new InMemoryProjectRepository();
  seedProjects(repo); // p_seed（staff01・PJ-SEED-001）
  let seq = 0;
  const uc = new LinkReportProjectsUseCase(repo, () => `p_${++seq}`);
  return { uc, repo };
}

describe('LinkReportProjectsUseCase (slice-11)', () => {
  it('AC-1: 既存案件（PJ-SEED-001）へ案件キーで紐づく（既存 id・重複作成しない）', async () => {
    const { uc } = makeUseCase();
    const r = await uc.execute({ userId: 'staff01', projects: [{ project_key: 'PJ-SEED-001', contribution: 'x' }] });
    expect(r.projects[0]?.id).toBe('p_seed');
    expect(r.projects[0]?.project_key).toBe('PJ-SEED-001');
  });

  it('AC-2: incident status が案件へ紐づいて返る', async () => {
    const { uc } = makeUseCase();
    const r = await uc.execute({
      userId: 'staff01',
      projects: [{ project_key: 'PJ-A', incidents: [{ status: '対応中' }] }],
    });
    expect(r.incidents[0]?.status).toBe('対応中');
    expect(r.incidents[0]?.project_id).toBe(r.projects[0]?.id);
    expect(r.projects[0]?.status).toBe('対応中'); // PROJECT.status = 最新インシデント status
  });

  it('AC-3: 未知キーは新規案件・同一キー再実行は既存 id（dedup）', async () => {
    const { uc } = makeUseCase();
    const a = await uc.execute({ userId: 'staff01', projects: [{ project_key: 'PJ-NEW' }] });
    expect(a.projects[0]?.id).not.toBe('p_seed');
    const b = await uc.execute({ userId: 'staff01', projects: [{ project_key: 'PJ-NEW' }] });
    expect(b.projects[0]?.id).toBe(a.projects[0]?.id);
  });

  it('AC-3: 案件キーはユーザー単位（別ユーザーの同名キーは別案件）', async () => {
    const { uc } = makeUseCase();
    const a = await uc.execute({ userId: 'staff01', projects: [{ project_key: 'PJ-SHARED' }] });
    const b = await uc.execute({ userId: 'staff02', projects: [{ project_key: 'PJ-SHARED' }] });
    expect(b.projects[0]?.id).not.toBe(a.projects[0]?.id);
  });

  it('AC-4: 不正な incident status は 422（保存前に throw＝原子性・案件は作られない）', async () => {
    const { uc, repo } = makeUseCase();
    await expect(
      uc.execute({ userId: 'staff01', projects: [{ project_key: 'PJ-BAD', incidents: [{ status: '未定義値' }] }] }),
    ).rejects.toBeInstanceOf(IncidentStatusInvalidError);
    // 部分適用なし: 未知キー PJ-BAD の案件は作られていない
    expect(await repo.findByUserAndKey('staff01', 'PJ-BAD')).toBeNull();
  });
});
