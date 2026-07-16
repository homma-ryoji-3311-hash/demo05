import { randomUUID } from 'node:crypto';
import express from 'express';
import { GetGreetingUseCase } from './template/use-case/getGreeting.js';
import { GreetingController } from './template/interfaceAdapter/api/controller/greetingController.js';
import { createGreetingRouter } from './template/interfaceAdapter/api/route/greetingRoute.js';
import type { GreetingRepositoryInterface } from './template/domain/interface/greetingRepository.js';
import { createHealthRouter } from './common/interfaceAdapter/api/route/health.js';
import { errorHandler } from './common/interfaceAdapter/api/middlewares/error-handler.js';
import { requestContext } from './common/interfaceAdapter/api/middlewares/request-context.js';
import { createAccessLogger } from './common/interfaceAdapter/api/middlewares/access-logger.js';
import { createDocsRouter } from './common/interfaceAdapter/api/openapi/route/docsRoute.js';
import { greetingContractGroup } from './template/interfaceAdapter/api/contract/greetingContract.js';
import type { ReportRepositoryInterface } from './reports/domain/interface/reportRepository.js';
import { CreateDraftUseCase } from './reports/use-case/createDraft.js';
import { UpdateDraftUseCase } from './reports/use-case/updateDraft.js';
import { GetDraftUseCase } from './reports/use-case/getDraft.js';
import { ReportController } from './reports/interfaceAdapter/api/controller/reportController.js';
import { createReportRouter } from './reports/interfaceAdapter/api/route/reportRoute.js';
import { InMemoryReportRepository, seedReports } from './reports/infra/repository/inMemoryReportRepository.js';

export interface AppDependencies {
  greetingRepository: GreetingRepositoryInterface;
  /** 省略時は seed 済みのインメモリ実装を使う（既存テストの createApp 呼び出しを不変に保つため）。 */
  reportRepository?: ReportRepositoryInterface;
  generateId?: () => string;
  clock?: () => Date;
}

/**
 * コンポジションルート。依存の組み立てはすべてここで行う。
 * リポジトリ実装は呼び出し側が注入する（main.ts は Prisma 実装、テストはインメモリ実装）。
 */
export function createApp(deps: AppDependencies): express.Express {
  const { greetingRepository } = deps;
  const reportRepository = deps.reportRepository ?? defaultReportRepository();
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
  // 受け入れテスト（acceptance）は root を叩く（案A・answer key と HTTP 等価）。overview §3 に合わせ root へ。
  app.use('/reports', createReportRouter({ reportController }));
  app.use('/api', createDocsRouter([greetingContractGroup]));
  app.use(errorHandler);
  return app;
}

/** reportRepository 未注入時の既定（seed 済みインメモリ）。既存テストの createApp 呼び出しを不変に保つ。 */
function defaultReportRepository(): ReportRepositoryInterface {
  const repo = new InMemoryReportRepository();
  seedReports(repo);
  return repo;
}
