import type { DomainError, ErrorKind } from '../../../common/error/domainError.js';

/**
 * あいさつメッセージが空のときのドメインエラー。
 * Error を直接 extends しつつ DomainError を実装し、kind='validation' を宣言するだけで
 * 共通の error-handler が 400 に変換する。
 */
export class EmptyGreetingMessageError extends Error implements DomainError {
  readonly kind: ErrorKind = 'validation';

  constructor() {
    super('あいさつメッセージは必須です');
    this.name = 'EmptyGreetingMessageError';
  }
}
