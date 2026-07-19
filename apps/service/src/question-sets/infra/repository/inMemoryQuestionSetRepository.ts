import type { QuestionSetRepositoryInterface } from '../../domain/interface/questionSetRepository.js';
import type { QuestionSet } from '../../domain/model/questionSet.js';

/** インメモリの設問セットストア（テスト・dev）。公開版も同じ Map に別 id で残す（過去版不変・AC-4）。 */
export class InMemoryQuestionSetRepository implements QuestionSetRepositoryInterface {
  private readonly records = new Map<string, QuestionSet>();

  async findById(id: string): Promise<QuestionSet | null> {
    return this.records.get(id) ?? null;
  }

  async save(qs: QuestionSet): Promise<void> {
    this.records.set(qs.id, qs);
  }

  async maxPublishedVersion(groupId: string): Promise<number> {
    let max = 0;
    for (const qs of this.records.values()) {
      if (qs.group_id === groupId && qs.status === 'published') max = Math.max(max, qs.version ?? 0);
    }
    return max;
  }
}

/**
 * オラクル(server.mjs qs_seed_v1)と同一の合成 seed（slice-19・parity）。
 * grp_engineer の published v1。過去報告が参照する不変版（AC-4）＝新版公開後も変わらない観測源。
 */
export function seedQuestionSets(repo: InMemoryQuestionSetRepository): void {
  void repo.save({
    id: 'qs_seed_v1',
    group_id: 'grp_engineer',
    version: 1,
    status: 'published',
    questions: [
      { order: 1, format: 'short', required: true, role_tag: 'project_key', text: '案件キー' },
      { order: 2, format: 'long', required: true, role_tag: 'skill', text: '使ったスキル' },
    ],
  });
}
