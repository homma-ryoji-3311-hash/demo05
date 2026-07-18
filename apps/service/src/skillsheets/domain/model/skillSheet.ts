import type { DomainError } from '../../../common/error/domainError.js';

/**
 * スキルシートの構造化 content（AI言い換えの出力・テンプレートのアンカーに対応する固定スキーマ）。
 * 数値は含めない＝マスターに無い数値を創作しない（AC-2）。オラクル(server.mjs)の content と同一キー。
 */
export interface SkillSheetContent {
  career_summary: string[];
  skills: string[];
  issues: string[];
}

/** 永続化・復元用のプレーン表現（camelCase）。HTTP レスポンス形はコントローラで snake_case に変換する。 */
export interface SkillSheetProps {
  id: string;
  staffId: string;
  filename: string;
  fileUrl: string;
  createdAt: string;
  content: SkillSheetContent;
}

/**
 * 生成済みスキルシート（slice-08）。生成の3フェーズ（データ組立→AI言い換え→テンプレート反映）は
 * use-case が編成し、本エンティティは組み上がった生成物（不変）を表す。
 * 再生成は新 id の別オブジェクトとして作る＝非破壊（旧版は履歴として残す・観測は slice-09）。
 */
export class SkillSheetEntity {
  private constructor(private readonly props: SkillSheetProps) {}

  /** 新規生成物。 */
  static create(props: SkillSheetProps): SkillSheetEntity {
    return new SkillSheetEntity(props);
  }

  /** 永続化層からの復元（検証済みデータの再構築）。 */
  static reconstruct(props: SkillSheetProps): SkillSheetEntity {
    return new SkillSheetEntity(props);
  }

  get id(): string {
    return this.props.id;
  }
  get staffId(): string {
    return this.props.staffId;
  }

  toPersistence(): SkillSheetProps {
    return {
      id: this.props.id,
      staffId: this.props.staffId,
      filename: this.props.filename,
      fileUrl: this.props.fileUrl,
      createdAt: this.props.createdAt,
      content: {
        career_summary: [...this.props.content.career_summary],
        skills: [...this.props.content.skills],
        issues: [...this.props.content.issues],
      },
    };
  }
}

/**
 * 他人の staff_id を対象にした生成要求（deny-by-default）。kind=forbidden → 403（AC-5）。
 * domain/error/ はスライス範囲外のため、ドメイン概念としてモデルに co-locate する（reportErrors 相当）。
 */
export class SkillSheetForbiddenError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor(staffId: string) {
    super(`skill sheet generation for staff ${staffId} is not permitted`);
    this.name = 'SkillSheetForbiddenError';
  }
}

/** 対象スタッフの合成マスターが無い。kind=not_found → 404（オラクル parity・no_master_data）。 */
export class MasterNotFoundError extends Error implements DomainError {
  readonly kind = 'not_found' as const;
  constructor(staffId: string) {
    super(`no master data for staff ${staffId}`);
    this.name = 'MasterNotFoundError';
  }
}

/**
 * Prisma 永続化が未配線（SkillSheet モデルのマイグレーション待ち・統合役）。kind=internal → 500。
 * slice-08 ではスキーマ変更・マイグレーションが禁止のため、本番実装の骨格のみ用意し呼び出しは未実装。
 * ローカル/CI の緑検証は InMemorySkillSheetRepository で行う（本エラーには到達しない）。
 */
export class SkillSheetPersistenceUnavailableError extends Error implements DomainError {
  readonly kind = 'internal' as const;
  constructor(operation: string) {
    super(`skill sheet persistence not wired: ${operation} awaits SkillSheet migration (統合役)`);
    this.name = 'SkillSheetPersistenceUnavailableError';
  }
}
