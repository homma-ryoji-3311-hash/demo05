import type { NextFunction, Request, Response } from 'express';
import * as z from 'zod';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../../common/interfaceAdapter/api/middlewares/error-handler.js';
import { HttpException } from '../../common/interfaceAdapter/api/httpException.js';
import type { DomainError, ErrorKind } from '../../common/error/domainError.js';

/** status()/json() を記録するだけの最小レスポンススタブ */
class FakeResponse {
  headersSent = false;
  statusCode = 0;
  body: unknown;
  status(code: number): this {
    this.statusCode = code;
    return this;
  }
  json(body: unknown): this {
    this.body = body;
    return this;
  }
}

function handle(err: unknown): FakeResponse {
  const res = new FakeResponse();
  errorHandler(err, {} as Request, res as unknown as Response, (() => undefined) as NextFunction);
  return res;
}

class ConflictError extends Error implements DomainError {
  readonly kind: ErrorKind = 'conflict';
  constructor() {
    super('重複しています');
    this.name = 'ConflictError';
  }
}

describe('errorHandler', () => {
  it('ZodError は 422 と invalid_request を返す（CLAUDE.md §6: バリデーション失敗は 422）', () => {
    const parsed = z.string().safeParse(123);
    const res = handle(parsed.success ? new Error('unexpected') : parsed.error);
    expect(res.statusCode).toBe(422);
    expect(res.body).toMatchObject({ error: 'invalid_request' });
  });

  it('AppError は kind に応じたステータスに変換される（conflict → 409）', () => {
    const res = handle(new ConflictError());
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: '重複しています' });
  });

  it('HttpException は指定ステータスを返す', () => {
    const res = handle(new HttpException(404, 'not found'));
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'not found' });
  });

  it('未知のエラーは 500 に握りつぶす（内部情報を漏らさない）', () => {
    const res = handle(new Error('DB接続の生々しい詳細'));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
