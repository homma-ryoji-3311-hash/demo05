import { EmptyGreetingMessageError } from '../error/emptyGreetingMessageError.js';

/**
 * デモ用のあいさつエンティティ。Hello World デモの中心となるドメインモデル。
 * イミュータブルに扱い、生成時にビジネスルール（メッセージ非空）を検証する。
 */
export class GreetingDomainEntity {
  private constructor(
    private readonly _id: string,
    private readonly _message: string,
    private readonly _createdAt: Date,
  ) {}

  get id(): string {
    return this._id;
  }

  get message(): string {
    return this._message;
  }

  get createdAt(): Date {
    return new Date(this._createdAt.getTime());
  }

  /** 新規作成。ビジネスルールを検証する */
  static create(params: { id: string; message: string; now: Date }): GreetingDomainEntity {
    assertMessageNotEmpty(params.message);

    return new GreetingDomainEntity(params.id, params.message, params.now);
  }

  /** 永続化層からの復元。検証済みデータの再構築なのでルール検証しない */
  static reconstruct(params: { id: string; message: string; createdAt: Date }): GreetingDomainEntity {
    return new GreetingDomainEntity(params.id, params.message, params.createdAt);
  }

  /** レスポンス・永続化用のプレーンオブジェクト表現 */
  toJSON(): { id: string; message: string; createdAt: Date } {
    return {
      id: this._id,
      message: this._message,
      createdAt: this.createdAt,
    };
  }
}

function assertMessageNotEmpty(message: string): void {
  if (message.trim() === '') {
    throw new EmptyGreetingMessageError();
  }
}
