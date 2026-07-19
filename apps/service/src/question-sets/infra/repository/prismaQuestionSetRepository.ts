import type { QuestionSetRepositoryInterface } from '../../domain/interface/questionSetRepository.js';
import type { QuestionSet } from '../../domain/model/questionSet.js';
import { QuestionSetPersistenceUnavailableError } from '../../domain/model/questionSet.js';

/**
 * Prisma 実装（未配線・マイグレーションは統合役／層境ゲート経由）。
 * DB スキーマ確定まで throw して「まだ使えない」を明示する（黙って空を返さない）。
 */
export class PrismaQuestionSetRepository implements QuestionSetRepositoryInterface {
  async findById(_id: string): Promise<QuestionSet | null> {
    throw new QuestionSetPersistenceUnavailableError('findById');
  }
  async save(_qs: QuestionSet): Promise<void> {
    throw new QuestionSetPersistenceUnavailableError('save');
  }
  async maxPublishedVersion(_groupId: string): Promise<number> {
    throw new QuestionSetPersistenceUnavailableError('maxPublishedVersion');
  }
}
