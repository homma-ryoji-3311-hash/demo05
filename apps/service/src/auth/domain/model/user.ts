/**
 * 認証ユーザーのドメインモデル（slice-06）。
 * reports の ReportEntity（クラス）と異なり、user は不変の素データなので type ベースで表す
 * （Explore の地図・指示書 §3「type ベースの設計」）。
 */
export type UserRole = 'staff' | 'admin' | 'manager' | 'super_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  /** 所属グループ（slice-10: テンプレート管理の版グループ）。staff は未設定でよい。 */
  group_id?: string;
  /** 担当グループ（複数・slice-14 管理者コンソール）。manager がタブ/可視範囲に使う。未設定なら group_id を単一要素として扱う。 */
  groups?: string[];
}

/**
 * 許可ドメイン。オラクル（reference-mock）と同値。
 * 実 OAuth クライアントシークレットではなく公開してよい定数なので、ここに直接置く
 * （実鍵は .env のみ・差分に出さない・指示書 §6）。
 */
export const ALLOWED_DOMAIN = 'example.test';

/** email が許可ドメインに属するか。空 email も不許可。許可外は 403（DomainNotAllowedError）。 */
export function isAllowedEmail(email: string): boolean {
  const domain = email.split('@')[1];
  return Boolean(email) && domain === ALLOWED_DOMAIN;
}

/** email からユーザー ID を導出する（オラクルと同一: ローカル部）。 */
export function userIdFromEmail(email: string): string {
  return email.split('@')[0] ?? '';
}
