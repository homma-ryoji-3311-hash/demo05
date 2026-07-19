import type { DomainError } from '../../../common/error/domainError.js';

/** 報告状況（§3.9 の二値）。5 ステータスは slice-15。 */
export type ReportStatus = 'reported' | 'not_reported';

/**
 * 管理者コンソールのスタッフ一覧行（slice-14・HTTP レスポンス形＝snake_case）。
 * 各行の操作の実挙動は slice-09/21、報告サイクル・5 ステータスは slice-15（本スライスは表示列のみ）。
 * オラクル server.mjs の adminStaffView と同一キー。
 */
export interface AdminStaffRow {
  id: string;
  name: string;
  group_id: string;
  client_name: string;
  last_report_at: string | null;
  report_status: ReportStatus;
  has_latest_sheet: boolean;
}

/** 管理者機能は manager 権限（staff/未登録は拒否）。kind=forbidden → 403（AC-4）。 */
export class AdminForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('admin console requires manager role');
    this.name = 'AdminForbiddenError';
  }
}

/** Prisma 永続化が未配線（スタッフ台帳のマイグレーション待ち・統合役）。kind=internal → 500。 */
export class AdminStaffPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`admin staff persistence not wired: ${operation} awaits migration (統合役)`);
    this.name = 'AdminStaffPersistenceUnavailableError';
  }
}
