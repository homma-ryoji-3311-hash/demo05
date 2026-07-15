import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { greetingSchema } from '../../template/interfaceAdapter/api/contract/greetingContract.js';
import { InMemoryGreetingRepository } from '../support/inMemoryGreetingRepository.js';
import { InMemoryReportRepository } from '../../reports/infra/repository/inMemoryReportRepository.js';

// Integration Test: モック禁止。InMemory実装を使ったcreateApp()で実際のHTTPフローを検証する
describe('GET /api/hello', () => {
  it('Hello World のあいさつを返す', async () => {
    const app = createApp({
      greetingRepository: new InMemoryGreetingRepository(),
      reportRepository: new InMemoryReportRepository(),
    });

    const res = await request(app).get('/api/hello');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Hello, World!');
    // レスポンスが contract の greetingSchema に準拠しているか（型と実レスポンスのドリフト検知）
    expect(greetingSchema.safeParse(res.body).success).toBe(true);
  });

  it('複数回叩いても同じあいさつを返す（初回のみ生成・以降は保存済み）', async () => {
    const app = createApp({
      greetingRepository: new InMemoryGreetingRepository(),
      reportRepository: new InMemoryReportRepository(),
    });

    const first = await request(app).get('/api/hello');
    const second = await request(app).get('/api/hello');
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.createdAt).toBe(first.body.createdAt);
  });
});
