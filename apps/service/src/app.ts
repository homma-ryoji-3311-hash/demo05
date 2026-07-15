import { randomUUID } from 'node:crypto';
import express from 'express';
import { GetGreetingUseCase } from './template/use-case/getGreeting.js';
import { GreetingController } from './template/interfaceAdapter/api/controller/greetingController.js';
import { createGreetingRouter } from './template/interfaceAdapter/api/route/greetingRoute.js';
import type { GreetingRepositoryInterface } from './template/domain/interface/greetingRepository.js';
import type { ReportRepositoryInterface } from './reports/domain/interface/reportRepository.js';
import type { UserRepositoryInterface } from './auth/domain/interface/userRepository.js';
import { CreateDraftUseCase } from './reports/use-case/createDraft.js';
import { UpdateDraftUseCase } from './reports/use-case/updateDraft.js';
import { GetDraftUseCase } from './reports/use-case/getDraft.js';
import { SummarizeReportUseCase } from './reports/use-case/summarizeReport.js';
import { ConfirmReportUseCase } from './reports/use-case/confirmReport.js';
import { ListReportsUseCase } from './reports/use-case/listReports.js';
import { GetReportUseCase } from './reports/use-case/getReport.js';
import { GetPreviousReportUseCase } from './reports/use-case/getPreviousReport.js';
import { FakeSummarizer } from './reports/infra/summarizer/fakeSummarizer.js';
import { ReportController } from './reports/interfaceAdapter/api/controller/reportController.js';
import { createReportRouter } from './reports/interfaceAdapter/api/route/reportRoute.js';
import { InMemoryUserRepository, seedUsers } from './auth/infra/repository/inMemoryUserRepository.js';
import { AuthGoogleCallbackUseCase } from './auth/use-case/authGoogleCallback.js';
import { GetMeUseCase } from './auth/use-case/getMe.js';
import { AuthController } from './auth/interfaceAdapter/api/controller/authController.js';
import { createAuthRouter } from './auth/interfaceAdapter/api/route/authRoute.js';
import { GetHomeUseCase } from './home/use-case/getHome.js';
import { HomeController } from './home/interfaceAdapter/api/controller/homeController.js';
import { createHomeRouter } from './home/interfaceAdapter/api/route/homeRoute.js';
import { createHealthRouter } from './common/interfaceAdapter/api/route/health.js';
import { errorHandler } from './common/interfaceAdapter/api/middlewares/error-handler.js';
import { requestContext } from './common/interfaceAdapter/api/middlewares/request-context.js';
import { createAccessLogger } from './common/interfaceAdapter/api/middlewares/access-logger.js';
import { createDocsRouter } from './common/interfaceAdapter/api/openapi/route/docsRoute.js';
import { greetingContractGroup } from './template/interfaceAdapter/api/contract/greetingContract.js';

export interface AppDependencies {
  greetingRepository: GreetingRepositoryInterface;
  reportRepository: ReportRepositoryInterface;
  /** 省略時は seed 済みのインメモリ実装を使う（既存テストの createApp 呼び出しを不変に保つため）。 */
  userRepository?: UserRepositoryInterface;
  generateId?: () => string;
  clock?: () => Date;
}

/**
 * コンポジションルート。依存の組み立てはすべてここで行う。
 * リポジトリ実装は呼び出し側が注入する（main.ts は Prisma 実装、テストはインメモリ実装）。
 * Summarizer 等のフィーチャー内部の依存はここで構築する（外側の createApp 契約を安定させる）。
 */
export function createApp(deps: AppDependencies): express.Express {
  const { greetingRepository, reportRepository } = deps;
  const userRepository = deps.userRepository ?? defaultUserRepository();
  const generateId = deps.generateId ?? (() => randomUUID());
  const clock = deps.clock ?? (() => new Date());
  const summarizer = new FakeSummarizer();

  const greetingController = new GreetingController(new GetGreetingUseCase(greetingRepository, generateId, clock));
  const reportController = new ReportController(
    new CreateDraftUseCase(reportRepository, generateId),
    new UpdateDraftUseCase(reportRepository),
    new GetDraftUseCase(reportRepository),
    new SummarizeReportUseCase(reportRepository, summarizer),
    new ConfirmReportUseCase(reportRepository, summarizer),
    new ListReportsUseCase(reportRepository),
    new GetReportUseCase(reportRepository),
    new GetPreviousReportUseCase(reportRepository),
  );
  const authController = new AuthController(
    new AuthGoogleCallbackUseCase(userRepository),
    new GetMeUseCase(userRepository),
  );
  const homeController = new HomeController(new GetHomeUseCase(reportRepository));

  const app = express();
  app.use(requestContext());
  // express.json をアクセスログより先に置く。pino-http はリクエスト受信時に req を
  // シリアライズするため、先に body を parse しておかないと req.body がログに載らない。
  app.use(express.json());
  app.use(createAccessLogger());
  app.use('/api', createHealthRouter());
  app.use('/api/hello', createGreetingRouter({ greetingController }));
  // 受け入れテスト（acceptance）は root を叩く（read-only の契約）。overview §3 に合わせ root にマウントする。
  app.use('/reports', createReportRouter({ reportController }));
  app.use('/home', createHomeRouter({ homeController }));
  app.use('/', createAuthRouter({ authController })); // /auth/google/callback（public）と /me（protected）
  app.use('/api', createDocsRouter([greetingContractGroup]));
  app.use(errorHandler);
  return app;
}

/** userRepository 未注入時の既定（seed 済みインメモリ）。 */
function defaultUserRepository(): UserRepositoryInterface {
  const repo = new InMemoryUserRepository();
  seedUsers(repo);
  return repo;
}
