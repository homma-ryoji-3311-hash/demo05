import type { QuestionSet } from '../model/questionSet.js';

/**
 * 設問セットの read/write・版の保持ポート（slice-19）。
 * 公開時に版を切るため、グループ内の最大 published 版を問い合わせる（過去版は別 id で不変・AC-4）。
 */
export interface QuestionSetRepositoryInterface {
  findById(id: string): Promise<QuestionSet | null>;
  save(qs: QuestionSet): Promise<void>;
  /** groupId の published 設問セットの最大 version（無ければ 0）。 */
  maxPublishedVersion(groupId: string): Promise<number>;
}
