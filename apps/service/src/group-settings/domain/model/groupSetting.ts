import type { DomainError } from '../../../common/error/domainError.js';

/** グループ固有部分（設問セット版・シート様式・タブ表示）。設定データで切替（コード分岐を足さない・AC-1/AC-2）。 */
export interface GroupSetting {
  group_id: string;
  question_set_version: string | null;
  template_style: string | null;
  tab_label: string | null;
  /** 設定変更の反映日（翌日以降・AC-3）。 */
  effective_from: string | null;
}

/** 確定済み過去報告の作成時点スナップショット（不変履歴・AC-3/AC-5）。 */
export interface ReportSnapshot {
  report_id: string;
  staff_id: string;
  group_id: string;
  applied_settings: { question_set_version: string; template_style: string };
}

/** 翌日（設定変更の反映日・AC-3）。営業日計算の詳細は downstream。clock 注入で決定的に。 */
export function nextBusinessDay(now: Date): string {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * 既存設定へ部分更新をマージし effective_from=翌日を付す（オラクル PUT と同一）。
 * 未指定フィールドは既存値を保持（設定駆動）。過去報告スナップショットには一切触れない（不変・AC-3）。
 */
export function mergeGroupSetting(prev: GroupSetting | null, groupId: string, body: unknown, now: Date): GroupSetting {
  const b = (body ?? {}) as Record<string, unknown>;
  const str = (v: unknown, fallback: string | null): string | null => (typeof v === 'string' ? v : fallback);
  return {
    group_id: groupId,
    question_set_version: str(b.question_set_version, prev?.question_set_version ?? null),
    template_style: str(b.template_style, prev?.template_style ?? null),
    tab_label: str(b.tab_label, prev?.tab_label ?? null),
    effective_from: nextBusinessDay(now),
  };
}

export class GroupSettingNotFoundError extends Error implements DomainError {
  readonly kind = 'not_found' as const;
  constructor(id: string) {
    super(`group setting ${id} not found`);
    this.name = 'GroupSettingNotFoundError';
  }
}

/** グループ設定の編集は担当 manager のみ（担当外/staff は 403・AC-4）。 */
export class GroupSettingForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('group setting edit requires assigned manager');
    this.name = 'GroupSettingForbiddenError';
  }
}

export class GroupSettingValidationError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor(field: string) {
    super(`validation failed: ${field}`);
    this.name = 'GroupSettingValidationError';
  }
}

export class GroupSettingPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`group-setting persistence not wired: ${operation} awaits migration (統合役)`);
    this.name = 'GroupSettingPersistenceUnavailableError';
  }
}
