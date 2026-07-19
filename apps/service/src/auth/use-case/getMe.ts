import type { User } from '../domain/model/user.js';
import type { UserRepositoryInterface } from '../domain/interface/userRepository.js';

/**
 * 呼び出しユーザーの承認状態を読む seam（slice-17・/me が status を返すため）。
 * auth 本体はロールしか持たないので、承認状態（pending/active）はこのポート経由で staff-approval から読む。
 * 省略時は status を付けない（既存の /me 形を不変に保つ）。
 */
export interface AccountStatusReaderInterface {
  getStatus(userId: string): Promise<string | null>;
}

/**
 * 認証済みユーザー自身のプロフィール取得（slice-06 /me・slice-17 で status を追加）。
 * 認証（401）はルートの requireAuth ミドルウェアが担うので、ここには認証済み userId が渡る。
 * 既知ユーザーはその属性を返す。未登録の認証済み id はオラクルと同じく staff の合成プロフィールにフォールバックする。
 * statusReader 注入時は承認状態（pending/active）を併せて返す（承認待ち画面が自分の状態を知れる・AC-1）。
 */
export class GetMeUseCase {
  constructor(
    private readonly repo: UserRepositoryInterface,
    private readonly statusReader?: AccountStatusReaderInterface,
  ) {}

  async execute(input: { userId: string }): Promise<User & { status?: string }> {
    const user: User = (await this.repo.findById(input.userId)) ?? {
      id: input.userId,
      email: '',
      name: input.userId,
      role: 'staff',
    };
    if (!this.statusReader) return user;
    const status = await this.statusReader.getStatus(input.userId);
    return status ? { ...user, status } : user;
  }
}
