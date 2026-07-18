import type { AuthGoogleCallbackUseCase } from '../../../use-case/authGoogleCallback.js';
import type { GetMeUseCase } from '../../../use-case/getMe.js';
import type { User } from '../../../domain/model/user.js';

/** callback の 200 レスポンス形。オラクルと同一（user オブジェクト＋session トークン文字列）。 */
export interface CallbackResponse {
  user: User;
  session: string;
}

/** /me の 200 レスポンス形（id/role/name・受け入れテストが読む3フィールド）。 */
export interface MeResponse {
  id: string;
  role: string;
  name: string;
}

/**
 * HTTP ⇔ ユースケースの変換のみ（Express の Request/Response に依存しない）。
 * 戻り値を route が送出する。403（許可外）・401（未認証）は use-case/ミドルウェアが投げ、
 * 共通 error-handler が変換する。
 */
export class AuthController {
  constructor(
    private readonly authGoogleCallback: AuthGoogleCallbackUseCase,
    private readonly getMe: GetMeUseCase,
  ) {}

  /** GET /auth/google/callback（公開）。許可外は use-case が 403 を投げる。 */
  async googleCallback(email: unknown): Promise<{ status: number; body: CallbackResponse }> {
    const result = await this.authGoogleCallback.execute({ email });
    return { status: 200, body: result };
  }

  /** GET /me（保護）。userId は requireAuth 済みで渡る。 */
  async me(userId: string): Promise<{ status: number; body: MeResponse }> {
    const user = await this.getMe.execute({ userId });
    return { status: 200, body: { id: user.id, role: user.role, name: user.name } };
  }
}
