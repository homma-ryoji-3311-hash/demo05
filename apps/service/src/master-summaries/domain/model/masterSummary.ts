import type { DomainError } from '../../../common/error/domainError.js';

/** 突合済みマスターの1インシデント（key で一意・状態は最新で上書き）。 */
export interface IncidentEntry {
  key: string;
  status: string;
}

/** Prisma 永続化が未配線（MASTER_SUMMARIES モデルのマイグレーション待ち・統合役）。kind=internal → 500。 */
export class MasterSummaryPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`master-summary persistence not wired: ${operation} awaits MASTER_SUMMARIES migration (統合役)`);
    this.name = 'MasterSummaryPersistenceUnavailableError';
  }
}

/** 永続化・復元用のプレーン表現。§4 MASTER_SUMMARIES（(user_id, project_id, period) で一意）。 */
export interface MasterSummaryProps {
  userId: string;
  projectId: string;
  period: string;
  incidents: IncidentEntry[];
  reconciledAt: string;
}

/**
 * 突合済みマスター元データ（MASTER_SUMMARIES・slice-12）。
 * 案件×期間の集約。incident は `key` で dedup し最新 status で上書きする（追記でない・AC-2）。
 * 生報告ログ（REPORTS）とは別レイヤーで、突合はここにのみ書く（AC-3）。
 */
export class MasterSummaryEntity {
  private constructor(private readonly props: MasterSummaryProps) {}

  static create(props: MasterSummaryProps): MasterSummaryEntity {
    return new MasterSummaryEntity(props);
  }
  static reconstruct(props: MasterSummaryProps): MasterSummaryEntity {
    return new MasterSummaryEntity(props);
  }

  get userId(): string {
    return this.props.userId;
  }
  get projectId(): string {
    return this.props.projectId;
  }
  get period(): string {
    return this.props.period;
  }
  get incidents(): IncidentEntry[] {
    return this.props.incidents.map((i) => ({ ...i }));
  }

  /**
   * 既存 incidents に新報告の incidents を**増分マージ**する（全再処理でない・AC-1）。
   * 同一 `key` は最新 status で上書き、新規 key は追加（AC-2）。順序は既存→新規追加。
   */
  static mergeIncidents(existing: IncidentEntry[], incoming: IncidentEntry[]): IncidentEntry[] {
    const byKey = new Map(existing.map((i) => [i.key, { ...i }]));
    for (const inc of incoming) byKey.set(inc.key, { key: inc.key, status: inc.status });
    return [...byKey.values()];
  }

  toPersistence(): MasterSummaryProps {
    return { ...this.props, incidents: this.props.incidents.map((i) => ({ ...i })) };
  }

  /** HTTP レスポンス形（snake_case）。オラクル server.mjs と HTTP 等価。 */
  toResponse(): {
    user_id: string;
    project_id: string;
    period: string;
    summary: { incidents: IncidentEntry[] };
    reconciled_at: string;
  } {
    return {
      user_id: this.props.userId,
      project_id: this.props.projectId,
      period: this.props.period,
      summary: { incidents: this.props.incidents.map((i) => ({ ...i })) },
      reconciled_at: this.props.reconciledAt,
    };
  }
}
