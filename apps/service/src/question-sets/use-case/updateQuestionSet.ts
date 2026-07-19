import type { QuestionSetRepositoryInterface } from '../domain/interface/questionSetRepository.js';
import type { ManagerContextReaderInterface } from '../domain/interface/managerContextReader.js';
import {
  QuestionSetForbiddenError,
  QuestionSetNotFoundError,
  QuestionSetValidationError,
  normalizeQuestions,
  type QuestionSet,
} from '../domain/model/questionSet.js';

/** 設問セットを更新（並べ替え含む・slice-19 AC-1）。配列順＝並び順（order を再採番）。manager のみ・不正は 422。 */
export class UpdateQuestionSetUseCase {
  constructor(
    private readonly repo: QuestionSetRepositoryInterface,
    private readonly manager: ManagerContextReaderInterface,
  ) {}

  async execute(input: { userId: string; id: string; questions: unknown }): Promise<QuestionSet> {
    if (!(await this.manager.isManager(input.userId))) throw new QuestionSetForbiddenError();
    const qs = await this.repo.findById(input.id);
    if (!qs) throw new QuestionSetNotFoundError(input.id);
    const questions = normalizeQuestions(input.questions);
    if (!questions) throw new QuestionSetValidationError('questions');
    const updated: QuestionSet = { ...qs, questions };
    await this.repo.save(updated);
    return updated;
  }
}
