import type { UserEntity } from '../model/user.js';

/**
 * ユーザーリポジトリのインターフェース。実装は infra/repository/ に置き、app.ts で注入する。
 * OAuth コールバックの upsert（無ければ作成）と /me の参照に使う。
 */
export interface UserRepositoryInterface {
  findById(id: string): Promise<UserEntity | null>;
  save(user: UserEntity): Promise<void>; // upsert
}
