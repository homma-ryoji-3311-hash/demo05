import type { User } from '../../domain/model/user.js';
import type { UserRepositoryInterface } from '../../domain/interface/userRepository.js';

/**
 * インメモリ実装（テストダブル）。UserRepositoryInterface を満たす本物の実装で、
 * DB なしで認証フローを検証できる（受け入れテストの緑検証・PERSISTENCE=memory）。
 * 本番実装（Prisma）は後続で注入する（マイグレーションの実行は統合役・CLAUDE.md §1-2）。
 */
export class InMemoryUserRepository implements UserRepositoryInterface {
  private readonly records = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.records.get(id) ?? null;
  }

  async upsert(user: User): Promise<User> {
    const existing = this.records.get(user.id);
    if (existing) return existing; // 既存は上書きしない（オラクルと同義）
    this.records.set(user.id, user);
    return user;
  }
}

/**
 * dev/受け入れ用のシード（合成データのみ）。オラクル(tools/reference-mock-server/server.mjs)と同一。
 * - staff01: 既定の fixture user（受け入れテストが X-User-Id で使う／/me の対象）。
 * - staff02: r_other の所有者（他人 → 403 の検証相手）。
 * - mgr01:  テンプレート管理（slice-10）の manager。auth 本体ロジックは不変・seed のみ追加（指示書 §3）。
 */
export function seedUsers(repo: InMemoryUserRepository): void {
  void repo.upsert({ id: 'staff01', email: 'staff01@example.test', name: 'テスト太郎', role: 'staff' });
  void repo.upsert({ id: 'staff02', email: 'staff02@example.test', name: 'テスト花子', role: 'staff' });
  // slice-10: テンプレート管理は manager 権限。オラクル server.mjs:29 と同一 seed（role=manager・group_id）。
  void repo.upsert({
    id: 'mgr01',
    email: 'mgr01@example.test',
    name: '管理花子',
    role: 'manager',
    group_id: 'grp_synth_eng',
  });
  // slice-14: 管理者コンソールの担当管理者。担当グループ G1/G3（複数）。オラクル server.mjs の admin01 と同一 seed。
  void repo.upsert({
    id: 'admin01',
    email: 'admin01@example.test',
    name: '管理太郎',
    role: 'manager',
    groups: ['G1', 'G3'],
  });
  // slice-17: 承認主体＝super admin（承認・承認待ち一覧の可視範囲）。オラクル server.mjs の super01 と同一 seed。
  void repo.upsert({ id: 'super01', email: 'super01@example.test', name: '統括管理', role: 'super_admin' });
  // slice-17: 新規スタッフ（deny-by-default・承認待ち）。承認状態そのものは staffAccountRepository が源泉（オラクル parity）。
  void repo.upsert({ id: 'pend_ac1', email: 'newstaff1@example.test', name: '新人一', role: 'staff' });
  void repo.upsert({ id: 'pend_ac2', email: 'newstaff2@example.test', name: '新人二', role: 'staff' });
  void repo.upsert({ id: 'pend_ac3', email: 'newstaff3@example.test', name: '新人三', role: 'staff' });
  // slice-20: 雑感の閲覧最小ロール検証用。care01=メンタルケア担当・mgr_other=担当外 manager（雑感を見られない）。
  // オラクル server.mjs の care01/mgr_other と同一 seed。
  void repo.upsert({ id: 'care01', email: 'care01@example.test', name: 'ケア担当', role: 'mental_care' });
  void repo.upsert({
    id: 'mgr_other',
    email: 'mgrother@example.test',
    name: '別管理',
    role: 'manager',
    group_id: 'grp_other',
  });
}
