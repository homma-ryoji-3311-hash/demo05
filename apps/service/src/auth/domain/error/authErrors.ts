import type { DomainError } from '../../../common/error/domainError.js';

/**
 * 許可ドメイン外・招待外のログイン試行（AC-2）。kind=forbidden → error-handler が 403 に変換。
 * message はオラクルのレスポンス（{ error: 'domain_not_allowed' }）に合わせる。
 */
export class DomainNotAllowedError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('domain_not_allowed');
    this.name = 'DomainNotAllowedError';
  }
}
