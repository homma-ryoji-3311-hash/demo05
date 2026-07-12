import express from 'express';
import request from 'supertest';
import * as z from 'zod';
import { describe, expect, it } from 'vitest';
import { registerRoute } from '../../common/interfaceAdapter/api/openapi/registerRoute.js';
import type { RouteContract } from '../../common/interfaceAdapter/api/openapi/contractTypes.js';

const echoContract: RouteContract = {
  method: 'post',
  path: '/echo/:id',
  request: {
    body: z.object({ name: z.string().min(1) }),
    params: z.object({ id: z.string() }),
    query: z.object({ q: z.string() }),
  },
  responses: { '200': { description: 'ok' } },
};

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  registerRoute(router, echoContract, async ({ body, params, query }) => {
    return { status: 200, body: { body, params, query } };
  });
  app.use('/api', router);
  // 検証エラー(ZodError)を 400 で拾う最小ハンドラ
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    res.status(500).json({ error: 'error' });
  });
  return app;
}

describe('registerRoute', () => {
  it('検証済みの body/params/query をハンドラに渡し、status と body を返す', async () => {
    const res = await request(buildApp()).post('/api/echo/abc').query({ q: 'hello' }).send({ name: 'x' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ body: { name: 'x' }, params: { id: 'abc' }, query: { q: 'hello' } });
  });

  it('body 検証失敗時は next(err) 経由で 400 になる', async () => {
    const res = await request(buildApp()).post('/api/echo/abc').query({ q: 'hello' }).send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('query 検証失敗時は next(err) 経由で 400 になる', async () => {
    const res = await request(buildApp()).post('/api/echo/abc').send({ name: 'x' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_request' });
  });

  it('params 検証失敗時は next(err) 経由で 400 になる', async () => {
    const paramsContract: RouteContract = {
      ...echoContract,
      path: '/echo-strict/:id',
      request: { ...echoContract.request, params: z.object({ id: z.string().min(5) }) },
    };
    const app = express();
    app.use(express.json());
    const router = express.Router();
    registerRoute(router, paramsContract, async ({ body, params, query }) => {
      return { status: 200, body: { body, params, query } };
    });
    app.use('/api', router);
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'invalid_request' });
        return;
      }
      res.status(500).json({ error: 'error' });
    });

    const res = await request(app).post('/api/echo-strict/ab').query({ q: 'hello' }).send({ name: 'x' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'invalid_request' });
  });

  it('ハンドラが throw した場合、next(err) 経由で共通のエラーハンドラに伝播する', async () => {
    const app = express();
    app.use(express.json());
    const router = express.Router();
    registerRoute(router, echoContract, async () => {
      throw new Error('boom');
    });
    app.use('/api', router);
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err instanceof Error ? err.message : 'error' });
    });

    const res = await request(app).post('/api/echo/abc').query({ q: 'hello' }).send({ name: 'x' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'boom' });
  });
});
