import type { UserRepositoryInterface } from '../domain/interface/userRepository.js';

/** /me のレスポンス形（オラクルと同一: 未知ユーザーは name を持たない）。 */
export interface MeView {
  id: string;
  role: string;
  name?: string;
}

/**
 * 認証済みユーザーの自己情報を返す（slice-06）。
 * 未知の uid でも既定ロール staff で {id, role} を返す（オラクルのフォールバックと同一）。
 */
export class GetMeUseCase {
  constructor(private readonly repo: UserRepositoryInterface) {}

  async execute(input: { userId: string }): Promise<MeView> {
    const user = await this.repo.findById(input.userId);
    if (!user) return { id: input.userId, role: 'staff' };
    return { id: user.id, role: user.role, name: user.name };
  }
}
