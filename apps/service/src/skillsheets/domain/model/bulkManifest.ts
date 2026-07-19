import type { DomainError } from '../../../common/error/domainError.js';

/** 生成対象1件（ZIP に含むシート・機械命名）。 */
export interface BulkEntry {
  staff_id: string;
  filename: string;
}

/** スキップ1件（マスター未生成など）。 */
export interface BulkSkipped {
  staff_id: string;
  reason: string;
}

/** 除外者一覧（ZIP 同梱の manifest・AC-5）。スコア等は持たない。 */
export interface BulkManifest {
  generated: number;
  skipped: number;
  skipped_staff: string[];
}

/** 一括生成の結果（entries＋skipped＋manifest＝ZIP の semantics fixture）。 */
export interface BulkResult {
  entries: BulkEntry[];
  skipped: BulkSkipped[];
  manifest: BulkManifest;
}

/** 生成/スキップ集計から manifest を作る（オラクルと同一構造・AC-5）。 */
export function buildManifest(entries: BulkEntry[], skipped: BulkSkipped[]): BulkManifest {
  return { generated: entries.length, skipped: skipped.length, skipped_staff: skipped.map((s) => s.staff_id) };
}

/** 一括生成は manager のみ（staff は 403・AC-3）。kind=forbidden → 403。 */
export class BulkForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('bulk skill-sheet generation requires manager role');
    this.name = 'BulkForbiddenError';
  }
}

/** Prisma 永続化が未配線（マイグレーション待ち・統合役）。kind=internal → 500。 */
export class StaffRosterPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`staff-roster persistence not wired: ${operation} awaits migration (統合役)`);
    this.name = 'StaffRosterPersistenceUnavailableError';
  }
}
