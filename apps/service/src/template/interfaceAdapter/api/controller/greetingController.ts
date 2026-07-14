import type { GetGreetingUseCase } from '../../../use-case/getGreeting.js';
import type { HandlerResult } from '../../../../common/interfaceAdapter/api/openapi/registerRoute.js';
import type { Greeting } from '../contract/greetingContract.js';

/**
 * HTTP ⇔ ユースケースの変換のみを担う。
 * リクエスト検証は contract + registerRoute が済ませる。
 * Express の Request/Response には依存しない（戻り値の HandlerResult を route が送出する）。
 * 戻り値 body の型を contract の Greeting に固定しているので、レスポンス schema とズレると
 * コンパイルエラーになる（例: createdAt を Date のまま返すと string と合わず検出される）。
 */
export class GreetingController {
  constructor(private readonly getGreeting: GetGreetingUseCase) {}

  async hello(): Promise<HandlerResult<Greeting>> {
    const greeting = await this.getGreeting.execute();
    const json = greeting.toJSON();

    return {
      status: 200,
      body: { id: json.id, message: json.message, createdAt: json.createdAt.toISOString() },
    };
  }
}
