import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { InMemoryGreetingRepository } from '../support/inMemoryGreetingRepository.js';

describe('OpenAPI ドキュメント配信', () => {
  it('GET /api/openapi.json が OpenAPI 3.1 を返し hello エンドポイントを含む', async () => {
    const res = await request(createApp({ greetingRepository: new InMemoryGreetingRepository() })).get(
      '/api/openapi.json',
    );
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    const paths = Object.keys(res.body.paths);
    expect(paths).toContain('/api/hello');
    expect(res.body.paths['/api/hello'].get).toBeDefined();
  });

  it('GET /api/docs が Swagger UI(HTML) を返す', async () => {
    const res = await request(createApp({ greetingRepository: new InMemoryGreetingRepository() }))
      .get('/api/docs/')
      .redirects(1);
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
