import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiDocument } from '../buildOpenApiDocument.js';
import type { ContractGroup } from '../contractTypes.js';

/**
 * OpenAPI ドキュメントと Swagger UI を配信する。
 * ドキュメントは起動時に 1 回だけ全コントラクトから生成して使い回す。
 * 呼び出し側（コンポジションルート）が各フィーチャーの ContractGroup を注入する。
 */
export function createDocsRouter(groups: ContractGroup[]): Router {
  const document = buildOpenApiDocument(groups);
  const router = Router();

  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(document));

  return router;
}
