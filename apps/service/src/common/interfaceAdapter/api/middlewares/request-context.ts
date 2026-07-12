import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { runWithRequestContext } from '../../../logging/index.js';

/**
 * リクエストコンテキストを確立するミドルウェア。
 * x-request-id ヘッダがあれば引き継ぎ、なければ採番して AsyncLocalStorage に載せる。
 * 以降このリクエスト中の appLogger 出力には request_id が自動で付く。app.ts の先頭で use する。
 */
export function requestContext(): RequestHandler {
  return (req, _res, next) => {
    const requestId = req.header('x-request-id') ?? randomUUID();
    runWithRequestContext({ requestId }, () => {
      next();
    });
  };
}
