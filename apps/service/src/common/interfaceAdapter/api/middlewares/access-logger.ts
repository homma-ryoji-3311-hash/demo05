import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import type { Request, RequestHandler, Response } from 'express';
import { accessLogger, getRequestContext } from '../../../logging/index.js';

/**
 * HTTP リクエスト/レスポンスを自動でログ出力するミドルウェア（pino-http）。
 *
 * - アクセス専用の accessLogger を使い、req.id はリクエストコンテキストの request_id に揃える。
 * - リクエストボディ（req.body）とレスポンスボディ（res.json で返した値）をログに含める。
 * - ヘッダはログに出さない（Authorization / Cookie などの漏洩を避けるため）。
 * - 機密フィールドは redact でマスクする。新しい機密キーが増えたら REDACT_PATHS に追記すること。
 * - requestContext ミドルウェアより後、express.json より前に use する
 *   （ボディはレスポンス完了時にシリアライズされるので、その時点では parse 済み）。
 */

/** レスポンスボディを res に一時保存するためのキー。 */
const RESPONSE_BODY = Symbol('responseBody');

/** マスク対象のパス。req.body / res.body 直下の機密フィールドを想定。増えたらここに追記する。 */
const REDACT_PATHS = [
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.accessToken',
  'req.body.refreshToken',
  'req.body.secret',
  'res.body.token',
  'res.body.accessToken',
  'res.body.refreshToken',
  'res.body.secret',
];

/** ミリ秒を単位付きの読みやすい文字列にする（1000ms 以上は秒表記）。 */
function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

/** ログ対象オブジェクトの responseTime を単位付き文字列に置き換える。 */
function withFormattedDuration(val: Record<string, unknown>): Record<string, unknown> {
  const responseTime = val['responseTime'];
  return typeof responseTime === 'number' ? { ...val, responseTime: formatDuration(responseTime) } : val;
}

export function createAccessLogger(): RequestHandler {
  const middleware = pinoHttp({
    logger: accessLogger,
    // request_id は requestContext（AsyncLocalStorage）由来の文字列。無ければ採番する。
    genReqId: () => getRequestContext()?.requestId ?? randomUUID(),
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    // メッセージ（既定の "request completed" 等）は出さない。相関 ID は request_id（mixin）に集約する。
    customSuccessMessage: () => '',
    customErrorMessage: () => '',
    // responseTime に単位（ms / s）を付けて出力する
    customSuccessObject: (_req, _res, val: Record<string, unknown>) => withFormattedDuration(val),
    customErrorObject: (_req, _res, _err: unknown, val: Record<string, unknown>) => withFormattedDuration(val),
    serializers: {
      req(req) {
        // id（= request_id）は req 内に出す。top-level の request_id はアクセスログでは付与しない。
        // req.id は型上 object を含むため、文字列である requestId を直接使う（[object Object] 回避）。
        const raw = (req.raw ?? req) as Request;
        return { id: getRequestContext()?.requestId, method: raw.method, url: raw.url, body: raw.body as unknown };
      },
      res(res) {
        const raw = (res.raw ?? res) as Response & { [RESPONSE_BODY]?: unknown };
        return { statusCode: raw.statusCode, body: raw[RESPONSE_BODY] };
      },
    },
  });

  return (req, res, next) => {
    // res.json で返した値を捕捉してレスポンスボディとしてログに載せる
    const target = res as Response & { [RESPONSE_BODY]?: unknown };
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      target[RESPONSE_BODY] = body;
      return originalJson(body);
    };
    middleware(req, res, next);
  };
}
