/**
 * 認証ユーザーのプレーン表現。認証は決定的フェイク（PM決定）で、
 * ロールは既定 'staff'。ドメインの複雑さは持たず、upsert と参照だけに使う。
 */
export interface UserProps {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class UserEntity {
  private constructor(private readonly props: UserProps) {}

  get id(): string {
    return this.props.id;
  }
  get role(): string {
    return this.props.role;
  }
  get name(): string {
    return this.props.name;
  }
  get email(): string {
    return this.props.email;
  }

  static create(props: UserProps): UserEntity {
    return new UserEntity(props);
  }

  static reconstruct(props: UserProps): UserEntity {
    return new UserEntity(props);
  }

  toPersistence(): UserProps {
    return { ...this.props };
  }

  /** OAuth コールバックのレスポンス形（全項目）。 */
  toResponse(): UserProps {
    return { ...this.props };
  }
}
