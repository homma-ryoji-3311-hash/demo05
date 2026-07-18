import { SkillSheetEntity, type SkillSheetProps } from '../../domain/model/skillSheet.js';
import type { SkillSheetRepositoryInterface } from '../../domain/interface/skillSheetRepository.js';

/**
 * インメモリ実装（テストダブル）。SkillSheetRepositoryInterface を満たす本物の実装で、
 * DB なしで生成フローを検証できる（受け入れテストの緑検証・PERSISTENCE=memory）。
 * 再生成は新 id で save＝旧を上書きしない（非破壊・履歴の観測は slice-09）。
 * 本番は PrismaSkillSheetRepository。マイグレーションの実行は統合役（CLAUDE.md §1-2）。
 */
export class InMemorySkillSheetRepository implements SkillSheetRepositoryInterface {
  private readonly records = new Map<string, SkillSheetProps>();

  async save(sheet: SkillSheetEntity): Promise<void> {
    this.records.set(sheet.id, sheet.toPersistence());
  }

  async findById(id: string): Promise<SkillSheetEntity | null> {
    const r = this.records.get(id);
    return r ? SkillSheetEntity.reconstruct(r) : null;
  }

  /** 自分の生成済みシートを生成日時の新しい順で返す（同時刻は id 降順で後発を先頭に）。slice-09 AC-1。 */
  async findByUser(staffId: string): Promise<SkillSheetEntity[]> {
    return [...this.records.values()]
      .filter((r) => r.staffId === staffId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1))
      .map((r) => SkillSheetEntity.reconstruct(r));
  }
}

/**
 * dev/受け入れ用のシード（合成データのみ・憲法 §1-6）。オラクル(tools/reference-mock-server/server.mjs:75-99)と同一。
 * - sk_seed_v1/sk_seed_v2: staff01 の生成済み2版（履歴・生成日時の新しい順の観測源）。
 * - sk_other:            staff02（他人）のシート。閲覧/DL/プレビューが 403 になることの検証用（reports の r_other と同型）。
 * slice-08 の InMemory は seed を持たない（生成専用）。閲覧（slice-09）はこの seed を土台に観測する。
 */
export function seedSkillSheets(repo: InMemorySkillSheetRepository): void {
  void repo.save(
    SkillSheetEntity.reconstruct({
      id: 'sk_seed_v1',
      staffId: 'staff01',
      filename: 'テスト太郎_スキルシート_20260710.xlsx',
      fileUrl: 'https://synthetic-storage.test/skill-sheets/sk_seed_v1?sig=synthetic',
      createdAt: '2026-07-10T09:00:00Z',
      content: { career_summary: ['ダッシュボードの改修を担当（職務経歴）'], skills: ['フロントエンド'], issues: [] },
    }),
  );
  void repo.save(
    SkillSheetEntity.reconstruct({
      id: 'sk_seed_v2',
      staffId: 'staff01',
      filename: 'テスト太郎_スキルシート_20260715.xlsx',
      fileUrl: 'https://synthetic-storage.test/skill-sheets/sk_seed_v2?sig=synthetic',
      createdAt: '2026-07-15T09:00:00Z', // v1 より新しい＝一覧の先頭
      content: {
        career_summary: ['ダッシュボードの改修を担当（職務経歴）'],
        skills: ['フロントエンド', 'テスト設計'],
        issues: [],
      },
    }),
  );
  void repo.save(
    SkillSheetEntity.reconstruct({
      id: 'sk_other',
      staffId: 'staff02',
      filename: 'テスト花子_スキルシート_20260714.xlsx',
      fileUrl: 'https://synthetic-storage.test/skill-sheets/sk_other?sig=synthetic',
      createdAt: '2026-07-14T09:00:00Z',
      content: { career_summary: ['他スタッフの職務経歴'], skills: [], issues: [] },
    }),
  );
}
