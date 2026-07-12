import * as z from 'zod';
import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from '../../common/interfaceAdapter/api/openapi/buildOpenApiDocument.js';
import type { ContractGroup } from '../../common/interfaceAdapter/api/openapi/contractTypes.js';

const group: ContractGroup = {
  basePath: '/api/widgets',
  contracts: [
    {
      method: 'post',
      path: '/',
      summary: 'create widget',
      tags: ['widgets'],
      request: { body: z.object({ name: z.string() }) },
      responses: { '201': { description: 'created', schema: z.object({ id: z.string() }) } },
    },
    {
      method: 'post',
      path: '/:id/confirm',
      summary: 'confirm widget',
      tags: ['widgets'],
      request: { params: z.object({ id: z.string() }) },
      responses: { '200': { description: 'ok', schema: z.object({ id: z.string() }) } },
    },
  ],
};

describe('buildOpenApiDocument', () => {
  it('OpenAPI 3.1 ドキュメントを生成する', () => {
    const doc = buildOpenApiDocument([group]);
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.title).toBeTruthy();
  });

  it('Express パスを OpenAPI 形式に変換し全エンドポイントを含む', () => {
    const doc = buildOpenApiDocument([group]);
    const paths = doc.paths ?? {};
    expect(Object.keys(paths).sort()).toEqual(['/api/widgets', '/api/widgets/{id}/confirm']);
    expect(paths['/api/widgets']?.post).toBeDefined();
    expect(paths['/api/widgets/{id}/confirm']?.post).toBeDefined();
  });

  it('requestBody / responses / path パラメータを構造まで生成する', () => {
    const doc = buildOpenApiDocument([group]);
    const paths = doc.paths ?? {};

    // POST /api/widgets: requestBody と responses の schema が生成されること
    const createOp = paths['/api/widgets']?.post as Record<string, unknown> | undefined;
    const requestBody = createOp?.requestBody as Record<string, unknown> | undefined;
    const requestContent = requestBody?.content as Record<string, unknown> | undefined;
    const requestJson = requestContent?.['application/json'] as Record<string, unknown> | undefined;
    expect(requestJson?.schema).toBeDefined();

    const responses = createOp?.responses as Record<string, unknown> | undefined;
    const response201 = responses?.['201'] as Record<string, unknown> | undefined;
    const response201Content = response201?.content as Record<string, unknown> | undefined;
    const response201Json = response201Content?.['application/json'] as Record<string, unknown> | undefined;
    expect(response201Json?.schema).toBeDefined();

    // POST /api/widgets/{id}/confirm: path パラメータ id が生成されること
    const confirmOp = paths['/api/widgets/{id}/confirm']?.post as Record<string, unknown> | undefined;
    const parameters = confirmOp?.parameters as Array<Record<string, unknown>> | undefined;
    const pathParam = parameters?.find((p) => p.in === 'path' && p.name === 'id');
    expect(pathParam).toBeDefined();
    expect(pathParam?.required).toBe(true);
  });
});
