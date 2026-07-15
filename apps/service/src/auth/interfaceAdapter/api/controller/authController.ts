import type { AuthGoogleCallbackUseCase } from '../../../use-case/authGoogleCallback.js';
import type { GetMeUseCase, MeView } from '../../../use-case/getMe.js';
import type { UserProps } from '../../../domain/model/user.js';

/** HTTP ⇔ ユースケースの変換のみ。Express の Request/Response には依存しない。 */
export class AuthController {
  constructor(
    private readonly authCallback: AuthGoogleCallbackUseCase,
    private readonly getMe: GetMeUseCase,
  ) {}

  /** slice-06: OAuth コールバック（public）。許可外ドメインは use-case が 403 を throw。 */
  async callback(email: string): Promise<{ status: number; body: { user: UserProps; session: string } }> {
    const result = await this.authCallback.execute({ email });
    return { status: 200, body: result };
  }

  /** slice-06: /me（protected）。 */
  async me(userId: string): Promise<{ status: number; body: MeView }> {
    const view = await this.getMe.execute({ userId });
    return { status: 200, body: view };
  }
}
