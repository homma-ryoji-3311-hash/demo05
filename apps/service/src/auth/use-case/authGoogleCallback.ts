import type { User } from '../domain/model/user.js';
import type { UserRepositoryInterface } from '../domain/interface/userRepository.js';
import { isAllowedEmail, userIdFromEmail } from '../domain/model/user.js';
import { DomainNotAllowedError } from '../domain/error/authErrors.js';

/**
 * 決定的フェイクのセッショントークン（PM決定・オラクルと同値）。
 * 実 OAuth の本物のセッション発行はここを差し替える（実鍵は .env・差分に出さない）。
 */
const FAKE_SESSION_TOKEN = 'fake-session-token';

/**
 * Google OAuth コールバック（フェイク seam）のユースケース（slice-06 AC-1/AC-2）。
 * - 許可ドメイン外・空 email は 403（DomainNotAllowedError）＝アプリのセッションを発行しない。
 * - 許可ドメインなら users に upsert（未登録は insert・role=staff）してセッションを返す。
 * 外部プロバイダは決定的フェイク。email 検証のみをドメインロジックとして持つ。
 */
export class AuthGoogleCallbackUseCase {
  constructor(private readonly repo: UserRepositoryInterface) {}

  async execute(input: { email: unknown }): Promise<{ user: User; session: string }> {
    const email = (typeof input.email === 'string' ? input.email : '').toLowerCase();
    if (!isAllowedEmail(email)) throw new DomainNotAllowedError(); // AC-2: 許可外 → 403
    const id = userIdFromEmail(email);
    const user = await this.repo.upsert({ id, email, name: id, role: 'staff' }); // AC-1: upsert（role 付与）
    return { user, session: FAKE_SESSION_TOKEN };
  }
}
