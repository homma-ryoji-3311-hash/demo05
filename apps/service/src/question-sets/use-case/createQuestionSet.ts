import type { QuestionSetRepositoryInterface } from '../domain/interface/questionSetRepository.js';
import type { ManagerContextReaderInterface } from '../domain/interface/managerContextReader.js';
import {
  QuestionSetForbiddenError,
  QuestionSetValidationError,
  normalizeQuestions,
  type QuestionSet,
} from '../domain/model/questionSet.js';

/** 設問セットを作成（下書き・slice-19 AC-1/AC-2）。manager のみ（403）・不正な形式/役割は 422。 */
export class CreateQuestionSetUseCase {
  constructor(
    private readonly repo: QuestionSetRepositoryInterface,
    private readonly manager: ManagerContextReaderInterface,
    private readonly generateId: () => string,
  ) {}

  async execute(input: { userId: string; groupId: unknown; questions: unknown }): Promise<QuestionSet> {
    if (!(await this.manager.isManager(input.userId))) throw new QuestionSetForbiddenError();
    const questions = normalizeQuestions(input.questions);
    if (!questions || typeof input.groupId !== 'string') throw new QuestionSetValidationError('questions');
    const qs: QuestionSet = {
      id: this.generateId(),
      group_id: input.groupId,
      version: null,
      status: 'draft',
      questions,
    };
    await this.repo.save(qs);
    return qs;
  }
}
