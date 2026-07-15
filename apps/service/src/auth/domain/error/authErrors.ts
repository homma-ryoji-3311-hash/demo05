import type { DomainError } from '../../../common/error/domainError.js';

/** 許可ドメイン外・招待外のログイン試行。kind=forbidden → 403（slice-06 AC-2）。 */
export class AuthDomainNotAllowedError extends Error implements DomainError {
  readonly kind = 'forbidden' as const;
  constructor() {
    super('login domain is not allowed');
    this.name = 'AuthDomainNotAllowedError';
  }
}
