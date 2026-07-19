import type { QuestionSetRepositoryInterface } from '../domain/interface/questionSetRepository.js';
import type { ManagerContextReaderInterface } from '../domain/interface/managerContextReader.js';
import { QuestionSetForbiddenError, QuestionSetNotFoundError, type QuestionSet } from '../domain/model/questionSet.js';

/** 設問セット取得（順序・形式・必須・役割タグを返す・slice-19）。manager のみ・未存在は 404。 */
export class GetQuestionSetUseCase {
  constructor(
    private readonly repo: QuestionSetRepositoryInterface,
    private readonly manager: ManagerContextReaderInterface,
  ) {}

  async execute(input: { userId: string; id: string }): Promise<QuestionSet> {
    if (!(await this.manager.isManager(input.userId))) throw new QuestionSetForbiddenError();
    const qs = await this.repo.findById(input.id);
    if (!qs) throw new QuestionSetNotFoundError(input.id);
    return qs;
  }
}
