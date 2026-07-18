import type { User } from '../domain/model/user.js';
import type { UserRepositoryInterface } from '../domain/interface/userRepository.js';

/**
 * 認証済みユーザー自身のプロフィール取得（slice-06 /me）。
 * 認証（401）はルートの requireAuth ミドルウェアが担うので、ここには認証済み userId が渡る。
 * 既知ユーザーはその属性を返す。未登録の認証済み id（フェイク seam で任意 id を名乗れる dev のみ）は
 * オラクルと同じく staff の合成プロフィールにフォールバックする。
 */
export class GetMeUseCase {
  constructor(private readonly repo: UserRepositoryInterface) {}

  async execute(input: { userId: string }): Promise<User> {
    const user = await this.repo.findById(input.userId);
    return user ?? { id: input.userId, email: '', name: input.userId, role: 'staff' };
  }
}
