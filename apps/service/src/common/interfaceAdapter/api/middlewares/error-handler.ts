import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isDomainError, type ErrorKind } from '../../../error/domainError.js';
import { HttpException } from '../httpException.js';
import { appLogger } from '../../../logging/index.js';

/** ドメインエラーの種別(kind) → HTTP ステータスの対応（マッピングはここに一元化する）。 */
const KIND_TO_STATUS: Record<ErrorKind, number> = {
  // バリデーション失敗は 422（CLAUDE.md §6。参照モック FastAPI の既定に合わせ、受け入れテストが要求する）。
  validation: 422,
  not_found: 404,
  conflict: 409,
  unauthorized: 401,
  internal: 500,
};

/**
 * アプリ共通・唯一のエラーハンドリング。すべてのルートのエラーはここに集約される。
 * - ZodError（境界のリクエスト検証失敗）→ 400
 * - DomainError（ドメインエラー）→ kind を KIND_TO_STATUS で HTTP ステータスに変換
 * - HttpException（境界で明示的に投げる HTTP エラー）→ 指定ステータス
 * - それ以外 → 500（ログに残す）
 * ドメインエラーに固有のステータスを増やしたい場合も、フィーチャーごとに変換関数を作らず
 * ErrorKind と KIND_TO_STATUS に追加する（大本の1個に集約する方針）。
 */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof ZodError) {
    // 境界のリクエスト検証失敗も 422（CLAUDE.md §6。400 では受け入れテストが赤い）。
    res.status(422).json({ error: 'invalid_request', details: err.issues });
    return;
  }
  if (isDomainError(err)) {
    res.status(KIND_TO_STATUS[err.kind]).json({ error: err.message });
    return;
  }
  if (err instanceof HttpException) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  appLogger.error({ err }, 'unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
