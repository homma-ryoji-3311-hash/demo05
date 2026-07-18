import { describe, expect, it } from 'vitest';
import {
  InMemorySkillSheetRepository,
  seedSkillSheets,
} from '../../skillsheets/infra/repository/inMemorySkillSheetRepository.js';
import { ListSkillSheetsUseCase } from '../../skillsheets/use-case/listSkillSheets.js';
import {
  GetSkillSheetForDownloadUseCase,
  SkillSheetNotFoundError,
} from '../../skillsheets/use-case/getSkillSheetForDownload.js';
import { GetSkillSheetPreviewUseCase } from '../../skillsheets/use-case/getSkillSheetPreview.js';
import { SkillSheetForbiddenError } from '../../skillsheets/domain/model/skillSheet.js';

function seededRepo(): InMemorySkillSheetRepository {
  const repo = new InMemorySkillSheetRepository();
  seedSkillSheets(repo); // sk_seed_v1/v2 (staff01) ＋ sk_other (staff02)
  return repo;
}

describe('slice-09 skillsheet-view use-cases', () => {
  it('AC-1: 自分のシートを生成日時の新しい順で返す（他人は混ざらない）', async () => {
    const list = await new ListSkillSheetsUseCase(seededRepo()).execute({ userId: 'staff01' });
    expect(list.map((s) => s.id)).toEqual(['sk_seed_v2', 'sk_seed_v1']); // created_at 降順
    for (const s of list) expect(s.staffId).toBe('staff01');
  });

  it('AC-2: ダウンロードは所有シートの元 xlsx（file_url/filename）を返す', async () => {
    const sheet = await new GetSkillSheetForDownloadUseCase(seededRepo()).execute({
      userId: 'staff01',
      id: 'sk_seed_v1',
    });
    const p = sheet.toPersistence();
    expect(p.fileUrl).toMatch(/^https?:\/\/.+/);
    expect(p.filename).toMatch(/\.xlsx$/);
  });

  it('AC-3: 他人のシートのダウンロードは 403（forbidden）', async () => {
    await expect(
      new GetSkillSheetForDownloadUseCase(seededRepo()).execute({ userId: 'staff01', id: 'sk_other' }),
    ).rejects.toBeInstanceOf(SkillSheetForbiddenError);
  });

  it('AC-3: 他人のシートのプレビューは 403（forbidden）', async () => {
    await expect(
      new GetSkillSheetPreviewUseCase(seededRepo()).execute({ userId: 'staff01', id: 'sk_other' }),
    ).rejects.toBeInstanceOf(SkillSheetForbiddenError);
  });

  it('AC-4: 存在しない ID は not_found（404）', async () => {
    await expect(
      new GetSkillSheetForDownloadUseCase(seededRepo()).execute({ userId: 'staff01', id: 'sk_missing' }),
    ).rejects.toBeInstanceOf(SkillSheetNotFoundError);
  });
});
