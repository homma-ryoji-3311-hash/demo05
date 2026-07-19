import { NotificationSettings, type NotificationSettingsProps } from '../../domain/model/notificationSettings.js';
import type { NotificationSettingsRepositoryInterface } from '../../domain/interface/notificationSettingsRepository.js';

/**
 * インメモリ実装（テストダブル）。NotificationSettingsRepositoryInterface を満たす本物の実装で、
 * DB なしで通知設定フローを検証できる（受け入れテストの緑検証・PERSISTENCE=memory）。
 * user_id 単位で保存。未設定ユーザーは null（use-case が既定値へフォールバック・AC-1）。
 * 本番は PrismaNotificationSettingsRepository。マイグレーション実行は統合役（CLAUDE.md §1-2）。
 */
export class InMemoryNotificationSettingsRepository implements NotificationSettingsRepositoryInterface {
  private readonly records = new Map<string, NotificationSettingsProps>();

  async findByUser(userId: string): Promise<NotificationSettings | null> {
    const r = this.records.get(userId);
    return r ? NotificationSettings.reconstruct(r) : null;
  }

  async save(settings: NotificationSettings): Promise<void> {
    this.records.set(settings.userId, settings.toPersistence());
  }
}
