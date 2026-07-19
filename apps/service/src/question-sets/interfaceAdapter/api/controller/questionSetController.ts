import type { CreateQuestionSetUseCase } from '../../../use-case/createQuestionSet.js';
import type { UpdateQuestionSetUseCase } from '../../../use-case/updateQuestionSet.js';
import type { GetQuestionSetUseCase } from '../../../use-case/getQuestionSet.js';
import type { PublishQuestionSetUseCase } from '../../../use-case/publishQuestionSet.js';
import type { QuestionSet, RoleTag } from '../../../domain/model/questionSet.js';

type Body = QuestionSet | { error: string; missing_roles: RoleTag[] };

/**
 * HTTP ⇔ ユースケースの変換のみ（slice-19 設問テンプレート）。
 * 403/404/422（不正）はドメインエラー→共通ハンドラ。公開ガードレールの 422 は missing_roles を返すため
 * ここで明示的に組み立てる（オラクル guardrail_failed と等価）。
 */
export class QuestionSetController {
  constructor(
    private readonly create: CreateQuestionSetUseCase,
    private readonly update: UpdateQuestionSetUseCase,
    private readonly get: GetQuestionSetUseCase,
    private readonly publish: PublishQuestionSetUseCase,
  ) {}

  async createSet(userId: string, body: unknown): Promise<{ status: number; body: QuestionSet }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const qs = await this.create.execute({ userId, groupId: b.group_id, questions: b.questions });
    return { status: 201, body: qs };
  }

  async updateSet(userId: string, id: string, body: unknown): Promise<{ status: number; body: QuestionSet }> {
    const b = (body ?? {}) as Record<string, unknown>;
    const qs = await this.update.execute({ userId, id, questions: b.questions });
    return { status: 200, body: qs };
  }

  async getSet(userId: string, id: string): Promise<{ status: number; body: QuestionSet }> {
    const qs = await this.get.execute({ userId, id });
    return { status: 200, body: qs };
  }

  async publishSet(userId: string, id: string): Promise<{ status: number; body: Body }> {
    const result = await this.publish.execute({ userId, id });
    if ('guardrail' in result) {
      return { status: 422, body: { error: 'guardrail_failed', missing_roles: result.guardrail } };
    }
    return { status: 200, body: result.published };
  }
}
