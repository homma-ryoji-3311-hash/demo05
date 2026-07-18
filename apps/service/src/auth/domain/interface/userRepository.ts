import type { User } from '../model/user.js';

/**
 * ユーザー永続化の抽象（router → use-case → repository の一方向・ADR-0011）。
 * 実装はインメモリ（受け入れ・dev）／将来 Prisma。
 */
export interface UserRepositoryInterface {
  /** id で 1 件取得。無ければ null。 */
  findById(id: string): Promise<User | null>;

  /**
   * upsert（insert-if-absent）。既存が居ればそのまま返し、居なければ挿入して返す。
   * オラクルの callback と同じ意味論（既存ユーザーの属性は上書きしない）。
   */
  upsert(user: User): Promise<User>;
}
