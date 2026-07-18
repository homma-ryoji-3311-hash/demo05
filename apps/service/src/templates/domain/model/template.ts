import type { DomainError } from '../../../common/error/domainError.js';

/** 差し込み位置アンカー（例: name→'B2', project_block→'A10:F14'）。値は空でないセル参照。 */
export type AnchorMap = Record<string, string>;

/** 永続化・復元用のプレーン表現（camelCase）。HTTP レスポンス形はコントローラで snake_case に変換する。 */
export interface TemplateProps {
  id: string;
  groupId: string;
  version: string;
  anchorMap: AnchorMap;
  fileUrl: string;
  isActive: boolean;
  uploadedBy: string;
  createdAt: string;
}

/** 差し込み位置アンカーの必須キー（欠落は 422・AC-2）。オラクル server.mjs:156 REQUIRED_ANCHORS と同一。 */
const REQUIRED_ANCHORS = ['name', 'project_block'] as const;

/** 欠落している必須アンカーを返す（空配列＝妥当）。オラクル validateAnchors(server.mjs:157) と同一規則。 */
export function missingAnchors(anchorMap: unknown): string[] {
  const m = (anchorMap ?? {}) as Record<string, unknown>;
  return REQUIRED_ANCHORS.filter((a) => typeof m[a] !== 'string' || (m[a] as string).length === 0);
}

/**
 * Excel テンプレート（slice-10）。版として保存し、有効版は同一グループ内で排他（切替で旧版は履歴に残す）。
 * アンカー検証（必須キーの欠落は 422）はドメインの不変条件としてここで強制する。
 */
export class TemplateEntity {
  private constructor(private props: TemplateProps) {}

  /**
   * 新規アップロード。必須アンカーの欠落は ReportValidationError 相当の 422（有効版に登録しない・AC-2）。
   * 初期は is_active=false（有効化は activate 経由・AC-3）。
   */
  static create(params: {
    id: string;
    groupId: string;
    version: string;
    anchorMap: AnchorMap;
    fileUrl: string;
    uploadedBy: string;
    createdAt: string;
  }): TemplateEntity {
    const missing = missingAnchors(params.anchorMap);
    if (missing.length) throw new TemplateValidationError(`missing anchors: ${missing.join(', ')}`);
    return new TemplateEntity({ ...params, isActive: false });
  }

  /** 永続化層からの復元（検証済みデータの再構築）。seed もこれで作る。 */
  static reconstruct(props: TemplateProps): TemplateEntity {
    return new TemplateEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get groupId(): string {
    return this.props.groupId;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }

  /** 有効版にする（AC-3）。同一グループ内の排他は use-case が担う。 */
  activate(): void {
    this.props = { ...this.props, isActive: true };
  }

  /** 有効版から外す（削除ではない＝履歴として残る・AC-3）。 */
  deactivate(): void {
    this.props = { ...this.props, isActive: false };
  }

  toPersistence(): TemplateProps {
    return { ...this.props, anchorMap: { ...this.props.anchorMap } };
  }
}

/** アンカー欠落など入力検証の失敗。kind=validation → 422（CLAUDE.md §6・有効版に登録しない）。 */
export class TemplateValidationError extends Error implements DomainError {
  readonly kind = 'validation' as const;
  constructor(message: string) {
    super(message);
    this.name = 'TemplateValidationError';
  }
}

/** テンプレート管理は manager 権限（staff/未登録は拒否）。kind=forbidden → 403（AC-4）。 */
export class TemplateForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('template management requires manager role');
    this.name = 'TemplateForbiddenError';
  }
}

/** 対象テンプレートが存在しない。kind=not_found → 404（オラクル parity）。 */
export class TemplateNotFoundError extends Error implements DomainError {
  readonly kind = 'not_found' as const;
  constructor(id: string) {
    super(`template ${id} not found`);
    this.name = 'TemplateNotFoundError';
  }
}

/** Prisma 永続化が未配線（Template モデルのマイグレーション待ち・統合役）。kind=internal → 500。 */
export class TemplatePersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`template persistence not wired: ${operation} awaits Template migration (統合役)`);
    this.name = 'TemplatePersistenceUnavailableError';
  }
}
