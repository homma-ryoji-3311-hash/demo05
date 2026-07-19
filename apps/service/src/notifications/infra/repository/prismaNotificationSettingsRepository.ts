import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import {
  NotificationSettingsPersistenceUnavailableError,
  type NotificationSettings,
} from '../../domain/model/notificationSettings.js';
import type { NotificationSettingsRepositoryInterface } from '../../domain/interface/notificationSettingsRepository.js';

/**
 * 本番の Prisma 実装（slice-13 スコープ）。
 * schema.prisma への NotificationSettings モデル追加とマイグレーション実行は統合役（CLAUDE.md §1-2・層境ゲート）。
 * 本スライスではスキーマ変更・マイグレーションが禁止のため未配線（ドメインエラーで明示）。
 * ローカル/CI の緑検証は InMemoryNotificationSettingsRepository（PERSISTENCE=memory）で行う。
 * インターフェースを満たすことで、モデル追加後はメソッド本体を差し替えるだけで本番接続できる。
 */
export class PrismaNotificationSettingsRepository implements NotificationSettingsRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(_userId: string): Promise<NotificationSettings | null> {
    void this.prisma;
    throw new NotificationSettingsPersistenceUnavailableError('findByUser');
  }

  async save(_settings: NotificationSettings): Promise<void> {
    void this.prisma;
    throw new NotificationSettingsPersistenceUnavailableError('save');
  }
}
