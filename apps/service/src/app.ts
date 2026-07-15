import { randomUUID } from 'node:crypto';
import express from 'express';
import { GetGreetingUseCase } from './template/use-case/getGreeting.js';
import { GreetingController } from './template/interfaceAdapter/api/controller/greetingController.js';
import { createGreetingRouter } from './template/interfaceAdapter/api/route/greetingRoute.js';
import type { GreetingRepositoryInterface } from './template/domain/interface/greetingRepository.js';
import type { ReportRepositoryInterface } from './reports/domain/interface/reportRepository.js';
import { CreateDraftUseCase } from './reports/use-case/createDraft.js';
import { UpdateDraftUseCase } from './reports/use-case/updateDraft.js';
import { GetDraftUseCase } from './reports/use-case/getDraft.js';
import { ReportController } from './reports/interfaceAdapter/api/controller/reportController.js';
import { createReportRouter } from './reports/interfaceAdapter/api/route/reportRoute.js';
import { createHealthRouter } from './common/interfaceAdapter/api/route/health.js';
import { errorHandler } from './common/interfaceAdapter/api/middlewares/error-handler.js';
import { requestContext } from './common/interfaceAdapter/api/middlewares/request-context.js';
import { createAccessLogger } from './common/interfaceAdapter/api/middlewares/access-logger.js';
import { createDocsRouter } from './common/interfaceAdapter/api/openapi/route/docsRoute.js';
import { greetingContractGroup } from './template/interfaceAdapter/api/contract/greetingContract.js';

export interface AppDependencies {
  greetingRepository: GreetingRepositoryInterface;
  reportRepository: ReportRepositoryInterface;
  generateId?: () => string;
  clock?: () => Date;
}

/**
 * コンポジションルート。依存の組み立てはすべてここで行う。
 * リポジトリ実装は呼び出し側が注入する（main.ts は Prisma 実装、テストはインメモリ実装）。
 */
export function createApp(deps: AppDependencies): express.Express {
  const { greetingRepository, reportRepository } = deps;
  const generateId = deps.generateId ?? (() => randomUUID());
  const clock = deps.clock ?? (() => new Date());

  const greetingController = new GreetingController(new GetGreetingUseCase(greetingRepository, generateId, clock));
  const reportController = new ReportController(
    new CreateDraftUseCase(reportRepository, generateId),
    new UpdateDraftUseCase(reportRepository),
    new GetDraftUseCase(reportRepository),
  );

  const app = express();
  app.use(requestContext());
  // express.json をアクセスログより先に置く。pino-http はリクエスト受信時に req を
  // シリアライズするため、先に body を parse しておかないと req.body がログに載らない。
  app.use(express.json());
  app.use(createAccessLogger());
  app.use('/api', createHealthRouter());
  app.use('/api/hello', createGreetingRouter({ greetingController }));
  // 受け入れテスト（acceptance）は /reports を叩く（read-only の契約）。overview §3 に合わせ root にマウントする。
  app.use('/reports', createReportRouter({ reportController }));
  app.use('/api', createDocsRouter([greetingContractGroup]));
  app.use(errorHandler);
  return app;
}
