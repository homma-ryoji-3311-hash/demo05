import type { PrismaService } from '../../../common/infra/prisma/prismaService.js';
import { AdminStaffPersistenceUnavailableError } from '../../domain/model/adminStaffRow.js';
import type { AdminStaffRow } from '../../domain/model/adminStaffRow.js';
import type { AdminStaffReaderInterface } from '../../domain/interface/adminStaffReader.js';

/**
 * 本番の Prisma 実装（slice-14 スコープ）。
 * スタッフ台帳（氏名・客先・最終報告・報告状況・最新シート）のスキーマ追加とマイグレーション実行は統合役
 * （CLAUDE.md §1-2・層境ゲート）。本スライスではスキーマ変更・マイグレーションが禁止のため未配線（ドメインエラーで明示）。
 * ローカル/CI の緑検証は InMemoryAdminStaffReader（PERSISTENCE=memory）で行う。
 */
export class PrismaAdminStaffReader implements AdminStaffReaderInterface {
  constructor(private readonly prisma: PrismaService) {}

  async findByGroups(_groupIds: string[]): Promise<AdminStaffRow[]> {
    void this.prisma;
    throw new AdminStaffPersistenceUnavailableError('findByGroups');
  }
}
