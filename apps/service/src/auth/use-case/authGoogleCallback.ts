import { HttpException } from '../../common/interfaceAdapter/api/httpException.js';
import { UserEntity, type UserProps } from '../domain/model/user.js';
import type { UserRepositoryInterface } from '../domain/interface/userRepository.js';

const ALLOWED_DOMAIN = 'example.test';

/**
 * OAuth コールバック（フェイク・slice-06 AC-1/AC-2）。
 * email のドメインが許可外なら 403。許可ドメインなら users を upsert（無ければ作成）し、
 * user とフェイクセッションを返す。既存ユーザーは上書きしない（オラクルと同一）。
 */
export class AuthGoogleCallbackUseCase {
  constructor(private readonly repo: UserRepositoryInterface) {}

  async execute(input: { email: string }): Promise<{ user: UserProps; session: string }> {
    const email = (input.email || '').toLowerCase();
    const domain = email.split('@')[1];
    if (!email || domain !== ALLOWED_DOMAIN) {
      throw new HttpException(403, 'domain_not_allowed');
    }
    const id = email.split('@')[0] ?? '';
    let user = await this.repo.findById(id);
    if (!user) {
      user = UserEntity.create({ id, email, name: id, role: 'staff' }); // upsert（無ければ作成）
      await this.repo.save(user);
    }
    return { user: user.toResponse(), session: 'fake-session-token' };
  }
}
