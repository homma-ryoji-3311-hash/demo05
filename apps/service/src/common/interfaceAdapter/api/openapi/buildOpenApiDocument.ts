import { createDocument, type ZodOpenApiOperationObject, type ZodOpenApiPathsObject } from 'zod-openapi';
import type { ContractGroup, RouteContract } from './contractTypes.js';

/** '/api/reports' + '/' → '/api/reports'、'/:id/confirm' → '/{id}/confirm' に整形して結合。 */
function toOpenApiPath(basePath: string, routePath: string): string {
  const converted = routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
  const joined = `${basePath}${converted === '/' ? '' : converted}`;
  return joined === '' ? '/' : joined;
}

function toOperation(contract: RouteContract): ZodOpenApiOperationObject {
  const operation: Record<string, unknown> = {
    tags: contract.tags || [],
    responses: {},
  };
  if (contract.summary !== undefined) {
    operation.summary = contract.summary;
  }
  if (contract.operationId !== undefined) {
    operation.operationId = contract.operationId;
  }

  if (contract.request?.params || contract.request?.query) {
    const requestParams: Record<string, unknown> = {};
    if (contract.request.params) {
      requestParams.path = contract.request.params;
    }
    if (contract.request.query) {
      requestParams.query = contract.request.query;
    }
    operation.requestParams = requestParams;
  }

  if (contract.request?.body) {
    operation.requestBody = {
      content: { 'application/json': { schema: contract.request.body } },
    };
  }

  const responses: Record<string, unknown> = {};
  for (const [status, response] of Object.entries(contract.responses)) {
    responses[status] = response.schema
      ? { description: response.description, content: { 'application/json': { schema: response.schema } } }
      : { description: response.description };
  }
  operation.responses = responses;

  return operation as unknown as ZodOpenApiOperationObject;
}

/** 全コントラクトグループから OpenAPI 3.1 ドキュメントを生成する。 */
export function buildOpenApiDocument(groups: ContractGroup[]): ReturnType<typeof createDocument> {
  const paths: ZodOpenApiPathsObject = {};

  for (const group of groups) {
    for (const contract of group.contracts) {
      const fullPath = toOpenApiPath(group.basePath, contract.path);
      paths[fullPath] ??= {};
      paths[fullPath][contract.method] = toOperation(contract);
    }
  }

  return createDocument({
    openapi: '3.1.0',
    info: { title: 'Staff Report API', version: '0.0.0' },
    paths,
  });
}
