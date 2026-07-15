/**
 * ドメインエラーの共通契約。
 *
 * ドメインエラーは Error を直接 extends（error-naming-convention 準拠）しつつ、この interface を
 * 実装して HTTP ではなく「種別(kind)」を宣言する。HTTP ステータスへの変換は共通の error-handler が
 * kind を見て一元的に行う（フィーチャーごとの変換関数 toXxxHttpException は作らない）。
 */
export type ErrorKind =
  'validation' | 'not_found' | 'conflict' | 'unauthorized' | 'forbidden' | 'external' | 'internal';

export interface DomainError {
  readonly kind: ErrorKind;
}

/** Error かつ DomainError（kind を持つ）かの型ガード。 */
export function isDomainError(err: unknown): err is Error & DomainError {
  return err instanceof Error && 'kind' in err;
}
