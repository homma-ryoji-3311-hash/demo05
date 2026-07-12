import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { pino } from 'pino';
import type { LoggingType } from './config.js';
import { getRequestContext } from './requestContext.js';

/**
 * アプリ共通のロガー基盤（pino）。
 */
const isProduction = process.env['NODE_ENV'] === 'production';
const isTest = process.env['NODE_ENV'] === 'test';

// アクセスログ（log_type: 'access'）は request_id を req.id として出すため、
// top-level の request_id は付与しない（重複を避ける）。それ以外のログには付与する。
const isAccessLogger = (logger: unknown): boolean =>
  (logger as { bindings?: () => Record<string, unknown> })?.bindings?.()?.['log_type'] === 'access';

// 本番（構造化 JSON）向け: 共通パラメータをフル付与する
const structuredOptions = {
  messageKey: 'message',
  base: { env: process.env['NODE_ENV'] ?? 'development', hostname: os.hostname() },
  formatters: { level: (label: string) => ({ log_level: label }) },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  mixin: (_mergeObject: object, _level: number, logger?: unknown) => ({
    log_id: randomUUID(),
    ...(isAccessLogger(logger) ? {} : { request_id: getRequestContext()?.requestId }),
  }),
};

// 開発向け: pino-pretty でメッセージ主体。共通パラメータは出さず、request_id のみ相関用に付与
const devOptions = {
  messageKey: 'message',
  mixin: (_mergeObject: object, _level: number, logger?: unknown) => {
    if (isAccessLogger(logger)) return {};
    const requestId = getRequestContext()?.requestId;
    return requestId ? { request_id: requestId } : {};
  },
  transport: {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:standard', messageKey: 'message', ignore: 'pid,hostname,log_type' },
  },
};

const root = pino({
  level: isTest ? 'silent' : (process.env['LOG_LEVEL'] ?? 'info'),
  ...(isProduction || isTest ? structuredOptions : devOptions),
});

/** アプリケーションログ（通常の error/info など） */
export const appLogger = root.child({ log_type: 'app' satisfies LoggingType });

/** アクセスログ（HTTP リクエスト/レスポンス。pino-http に渡す） */
export const accessLogger = root.child({ log_type: 'access' satisfies LoggingType });
