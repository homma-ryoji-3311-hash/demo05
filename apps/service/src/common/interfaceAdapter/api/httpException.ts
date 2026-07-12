/**
 * HTTPレスポンスに変換可能な例外。
 * status を明示して throw すると、共通の error-handler がそのステータスで送出する。
 */
export class HttpException extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpException';
  }
}
