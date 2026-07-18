import type { DomainError } from '../../../common/error/domainError.js';

/** インシデントの状態（突合時の状態更新に用いる・spec.md §3.3）。列挙値以外は 422。 */
export type IncidentStatus = '発生' | '対応中' | '解決';
const INCIDENT_STATUSES: readonly IncidentStatus[] = ['発生', '対応中', '解決'];

/** 値が列挙 IncidentStatus か（AC-4 のバリデーション）。 */
export function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === 'string' && (INCIDENT_STATUSES as readonly string[]).includes(value);
}

/** 永続化・復元用のプレーン表現。案件マスター（突合キー）。§4 PROJECTS。 */
export interface ProjectProps {
  id: string;
  userId: string;
  projectKey: string;
  clientName: string | null;
  status: IncidentStatus;
}

/**
 * 案件（PROJECTS）。突合キー `(user_id, project_key)` で一意（slice-11 AC-3）。
 * status は当該案件の最新インシデント状態を反映（突合＝上書きの土台。突合本体は slice-12）。
 */
export class ProjectEntity {
  private constructor(private props: ProjectProps) {}

  static create(props: ProjectProps): ProjectEntity {
    return new ProjectEntity(props);
  }
  static reconstruct(props: ProjectProps): ProjectEntity {
    return new ProjectEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get userId(): string {
    return this.props.userId;
  }
  get projectKey(): string {
    return this.props.projectKey;
  }
  get clientName(): string | null {
    return this.props.clientName;
  }
  get status(): IncidentStatus {
    return this.props.status;
  }

  /** 最新インシデント status を案件状態へ反映（spec: PROJECT.status＝最新インシデント status）。 */
  applyIncidentStatus(status: IncidentStatus): void {
    this.props = { ...this.props, status };
  }

  toPersistence(): ProjectProps {
    return { ...this.props };
  }
}

/** 列挙外のインシデントステータス。kind=validation → 422（部分適用なし＝原子性・AC-4）。 */
export class IncidentStatusInvalidError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor(value: unknown) {
    super(`invalid incident status: ${String(value)}`);
    this.name = 'IncidentStatusInvalidError';
  }
}

/** Prisma 永続化が未配線（PROJECTS モデルのマイグレーション待ち・統合役）。kind=internal → 500。 */
export class ProjectPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`project persistence not wired: ${operation} awaits PROJECTS migration (統合役)`);
    this.name = 'ProjectPersistenceUnavailableError';
  }
}
