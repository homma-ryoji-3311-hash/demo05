import { TemplateEntity, type TemplateProps } from '../../domain/model/template.js';
import type { TemplateRepositoryInterface } from '../../domain/interface/templateRepository.js';

/**
 * インメモリ実装（テストダブル）。TemplateRepositoryInterface を満たす本物の実装で、
 * DB なしでテンプレート管理フローを検証できる（受け入れテストの緑検証・PERSISTENCE=memory）。
 * 有効版切替は旧版を削除せず is_active=false で残す（履歴・AC-3）＝use-case が save で保つ。
 * 本番は PrismaTemplateRepository。マイグレーションの実行は統合役（CLAUDE.md §1-2）。
 */
export class InMemoryTemplateRepository implements TemplateRepositoryInterface {
  private readonly records = new Map<string, TemplateProps>();

  async save(template: TemplateEntity): Promise<void> {
    this.records.set(template.id, template.toPersistence());
  }

  async findById(id: string): Promise<TemplateEntity | null> {
    const r = this.records.get(id);
    return r ? TemplateEntity.reconstruct(r) : null;
  }

  /** 自グループの版一覧を生成日時の新しい順で返す（同時刻は id 降順）。オラクル server.mjs:305-307 と等価。 */
  async findByGroup(groupId: string): Promise<TemplateEntity[]> {
    return [...this.records.values()]
      .filter((t) => t.groupId === groupId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id < b.id ? 1 : -1))
      .map((t) => TemplateEntity.reconstruct(t));
  }
}

/**
 * dev/受け入れ用のシード（合成データのみ・憲法 §1-6）。オラクル(server.mjs:161-180 seedTemplate)と同一。
 * grp_synth_eng の2版（履歴・有効版切替の観測源）。v1 は履歴・v2 が現在の有効版。uploaded_by=mgr01。
 */
export function seedTemplates(repo: InMemoryTemplateRepository): void {
  void repo.save(
    TemplateEntity.reconstruct({
      id: 'tpl_seed_v1',
      groupId: 'grp_synth_eng',
      version: 'v1',
      anchorMap: { name: 'B2', project_block: 'A10:F14' },
      fileUrl: 'https://synthetic-storage.test/templates/tpl_seed_v1?sig=synthetic',
      isActive: false,
      uploadedBy: 'mgr01',
      createdAt: '2026-07-10T09:00:00Z',
    }),
  );
  void repo.save(
    TemplateEntity.reconstruct({
      id: 'tpl_seed_v2',
      groupId: 'grp_synth_eng',
      version: 'v2',
      anchorMap: { name: 'B2', project_block: 'A10:F14' },
      fileUrl: 'https://synthetic-storage.test/templates/tpl_seed_v2?sig=synthetic',
      isActive: true, // 現在の有効版
      uploadedBy: 'mgr01',
      createdAt: '2026-07-15T09:00:00Z',
    }),
  );
}
