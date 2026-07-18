import { describe, expect, it } from 'vitest';
import { GenerateSkillSheetUseCase } from '../../skillsheets/use-case/generateSkillSheet.js';
import { InMemorySkillSheetRepository } from '../../skillsheets/infra/repository/inMemorySkillSheetRepository.js';
import { FakeSheetParaphraser } from '../../skillsheets/infra/paraphraser/fakeSheetParaphraser.js';
import { MasterNotFoundError, SkillSheetForbiddenError } from '../../skillsheets/domain/model/skillSheet.js';
import type { MasterData, MasterReaderInterface } from '../../skillsheets/domain/interface/masterReader.js';

/** 合成マスター（数値なし・AC-2 検証源）。オラクルの masters(staff01) と同型。 */
const MASTER: MasterData = {
  staffName: 'テスト太郎',
  summaryJson: { achievements: ['ダッシュボードの改修を担当'], skills: ['フロントエンド'], issues: [] },
};

function reader(map: Record<string, MasterData>): MasterReaderInterface {
  return { findByStaffId: async (id) => map[id] ?? null };
}

function makeUseCase(opts?: { masters?: Record<string, MasterData> }): GenerateSkillSheetUseCase {
  let seq = 0;
  return new GenerateSkillSheetUseCase(
    reader(opts?.masters ?? { staff01: MASTER }),
    new FakeSheetParaphraser(),
    new InMemorySkillSheetRepository(),
    () => `sk_${++seq}`,
    () => new Date('2026-07-19T09:00:00Z'),
  );
}

const flat = (c: { career_summary: string[]; skills: string[]; issues: string[] }): string[] => [
  ...c.career_summary,
  ...c.skills,
  ...c.issues,
];

describe('GenerateSkillSheetUseCase (slice-08)', () => {
  it('AC-1/AC-3: 3フェーズで構造化 content・filename・file_url を生成する', async () => {
    const sheet = await makeUseCase().execute({ userId: 'staff01' });
    const p = sheet.toPersistence();
    expect(flat(p.content).length).toBeGreaterThan(0);
    expect(p.filename).toMatch(/^.+_.+_\d{8}\.xlsx$/);
    expect(p.fileUrl).toMatch(/^https?:\/\/.+/);
  });

  it('AC-2: マスターに無い数値は content に現れない', async () => {
    const sheet = await makeUseCase().execute({ userId: 'staff01' });
    for (const s of flat(sheet.toPersistence().content)) expect(/\d/.test(s)).toBe(false);
  });

  it('AC-4: 再生成は新 id/file_url の別オブジェクト（非破壊）', async () => {
    const uc = makeUseCase();
    const a = (await uc.execute({ userId: 'staff01' })).toPersistence();
    const b = (await uc.execute({ userId: 'staff01' })).toPersistence();
    expect(a.id).not.toBe(b.id);
    expect(a.fileUrl).not.toBe(b.fileUrl);
  });

  it('AC-5: 他人の staff_id を対象にした生成は 403（forbidden）', async () => {
    await expect(makeUseCase().execute({ userId: 'staff01', staffId: 'staff02' })).rejects.toBeInstanceOf(
      SkillSheetForbiddenError,
    );
  });

  it('対象の合成マスターが無ければ not_found（404）', async () => {
    await expect(makeUseCase({ masters: {} }).execute({ userId: 'staff01' })).rejects.toBeInstanceOf(
      MasterNotFoundError,
    );
  });
});
