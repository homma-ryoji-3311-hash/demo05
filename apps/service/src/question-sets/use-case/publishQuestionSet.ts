import type { QuestionSetRepositoryInterface } from '../domain/interface/questionSetRepository.js';
import type { ManagerContextReaderInterface } from '../domain/interface/managerContextReader.js';
import {
  QuestionSetForbiddenError,
  QuestionSetNotFoundError,
  missingPublishRoles,
  type QuestionSet,
  type RoleTag,
} from '../domain/model/questionSet.js';

/** 公開の結果: ガードレール不足（422 で missing_roles を返す）か、公開済み（版を切った QuestionSet）。 */
export type PublishResult = { guardrail: RoleTag[] } | { published: QuestionSet };

/**
 * 設問セットを公開（slice-19 AC-3/AC-4）。manager のみ・未存在は 404。
 * 必須役割（project_key・skill）不足はガードレールで拒否（422・公開状態に遷移しない）。
 * 通れば版を切って published（過去 published 版は別 id で不変＝過去報告を壊さない）。
 */
export class PublishQuestionSetUseCase {
  constructor(
    private readonly repo: QuestionSetRepositoryInterface,
    private readonly manager: ManagerContextReaderInterface,
  ) {}

  async execute(input: { userId: string; id: string }): Promise<PublishResult> {
    if (!(await this.manager.isManager(input.userId))) throw new QuestionSetForbiddenError();
    const qs = await this.repo.findById(input.id);
    if (!qs) throw new QuestionSetNotFoundError(input.id);
    const missing = missingPublishRoles(qs.questions);
    if (missing.length) return { guardrail: missing }; // 公開拒否・状態不変
    const version = (await this.repo.maxPublishedVersion(qs.group_id)) + 1;
    const published: QuestionSet = { ...qs, version, status: 'published' };
    await this.repo.save(published);
    return { published };
  }
}
