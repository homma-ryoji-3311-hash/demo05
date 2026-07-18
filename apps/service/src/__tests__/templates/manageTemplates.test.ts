import { describe, expect, it } from 'vitest';
import {
  InMemoryTemplateRepository,
  seedTemplates,
} from '../../templates/infra/repository/inMemoryTemplateRepository.js';
import { UploadTemplateUseCase } from '../../templates/use-case/uploadTemplate.js';
import { ActivateTemplateUseCase } from '../../templates/use-case/activateTemplate.js';
import { ListTemplatesUseCase } from '../../templates/use-case/listTemplates.js';
import { TemplateForbiddenError, TemplateValidationError } from '../../templates/domain/model/template.js';
import type { UserContextReaderInterface } from '../../templates/domain/interface/userContextReader.js';

const VALID = { name: 'B2', project_block: 'A10:F14' };

/** mgr01=manager(grp_synth_eng) / staff01=staff の合成コンテキスト。 */
const ctx: UserContextReaderInterface = {
  findByUser: async (id) =>
    id === 'mgr01'
      ? { role: 'manager', groupId: 'grp_synth_eng' }
      : id === 'staff01'
        ? { role: 'staff', groupId: null }
        : null,
};

function seededRepo(): InMemoryTemplateRepository {
  const repo = new InMemoryTemplateRepository();
  seedTemplates(repo); // tpl_seed_v1/v2 (grp_synth_eng)
  return repo;
}

let seq = 0;
const gen = (): string => `tpl_${++seq}`;
const clock = (): Date => new Date('2026-07-19T09:00:00Z');

describe('slice-10 excel-template-manage use-cases', () => {
  it('AC-1: manager はアンカー付きでアップロードでき、版として保存される', async () => {
    const t = await new UploadTemplateUseCase(seededRepo(), ctx, gen, clock).execute({
      userId: 'mgr01',
      anchorMap: VALID,
    });
    const p = t.toPersistence();
    expect(p.version).toMatch(/^v\d+$/);
    expect(p.anchorMap).toMatchObject(VALID);
    expect(p.isActive).toBe(false); // 有効化は activate 経由
  });

  it('AC-2: 必須アンカー欠落は 422（validation）', async () => {
    await expect(
      new UploadTemplateUseCase(seededRepo(), ctx, gen, clock).execute({ userId: 'mgr01', anchorMap: {} }),
    ).rejects.toBeInstanceOf(TemplateValidationError);
  });

  it('AC-3: 有効版切替は指定版を有効化し、旧版は履歴として残る（削除しない）', async () => {
    const repo = seededRepo();
    const upload = new UploadTemplateUseCase(repo, ctx, gen, clock);
    const a = await upload.execute({ userId: 'mgr01', anchorMap: VALID });
    const b = await upload.execute({ userId: 'mgr01', anchorMap: VALID });
    const activated = await new ActivateTemplateUseCase(repo, ctx).execute({ userId: 'mgr01', id: a.id });
    expect(activated.isActive).toBe(true);

    const list = await new ListTemplatesUseCase(repo, ctx).execute({ userId: 'mgr01' });
    const byId = Object.fromEntries(list.map((t) => [t.id, t]));
    expect(byId[a.id].isActive).toBe(true);
    expect(byId[b.id]).toBeTruthy(); // 旧版 b は削除されず残る
    expect(byId[b.id].isActive).toBe(false);
    expect(byId['tpl_seed_v2'].isActive).toBe(false); // 旧有効版も切替で外れる（履歴として残る）
  });

  it('AC-4: staff のアップロードは 403（forbidden）', async () => {
    await expect(
      new UploadTemplateUseCase(seededRepo(), ctx, gen, clock).execute({ userId: 'staff01', anchorMap: VALID }),
    ).rejects.toBeInstanceOf(TemplateForbiddenError);
  });

  it('AC-4: staff の有効版切替は存在しない id でも 403（認可が id 参照より先）', async () => {
    await expect(
      new ActivateTemplateUseCase(seededRepo(), ctx).execute({ userId: 'staff01', id: 'tpl_any' }),
    ).rejects.toBeInstanceOf(TemplateForbiddenError);
  });
});
