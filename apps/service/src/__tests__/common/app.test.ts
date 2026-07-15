import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { InMemoryGreetingRepository } from '../support/inMemoryGreetingRepository.js';
import { InMemoryReportRepository } from '../../reports/infra/repository/inMemoryReportRepository.js';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(
      createApp({
        greetingRepository: new InMemoryGreetingRepository(),
        reportRepository: new InMemoryReportRepository(),
      }),
    ).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
