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
import type { SummarizerInterface } from './reports/domain/interface/summarizer.js';
import { CreateDraftUseCase } from './reports/use-case/createDraft.js';
import { UpdateDraftUseCase } from './reports/use-case/updateDraft.js';
import { GetDraftUseCase } from './reports/use-case/getDraft.js';
import { SummarizeReportUseCase } from './reports/use-case/summarizeReport.js';
import { ConfirmReportUseCase } from './reports/use-case/confirmReport.js';
import { ListReportsUseCase } from './reports/use-case/listReports.js';
import { LoadOwnedReportUseCase } from './reports/use-case/loadOwnedReport.js';
import { GetPreviousReportUseCase } from './reports/use-case/getPreviousReport.js';
import { ReportController } from './reports/interfaceAdapter/api/controller/reportController.js';
import { createReportRouter } from './reports/interfaceAdapter/api/route/reportRoute.js';
import { InMemoryReportRepository, seedReports } from './reports/infra/repository/inMemoryReportRepository.js';
import { FakeSummarizer } from './reports/infra/summarizer/fakeSummarizer.js';
import type { UserRepositoryInterface } from './auth/domain/interface/userRepository.js';
import { AuthGoogleCallbackUseCase } from './auth/use-case/authGoogleCallback.js';
import { GetMeUseCase } from './auth/use-case/getMe.js';
import { AuthController } from './auth/interfaceAdapter/api/controller/authController.js';
import { createAuthRouter, createMeRouter } from './auth/interfaceAdapter/api/route/authRoute.js';
import { InMemoryUserRepository, seedUsers } from './auth/infra/repository/inMemoryUserRepository.js';
import { requireAuth } from './common/interfaceAdapter/api/auth.js';
import type { ReportSummaryReaderInterface } from './home/domain/interface/reportSummaryReader.js';
import { GetHomeUseCase } from './home/use-case/getHome.js';
import { HomeController } from './home/interfaceAdapter/api/controller/homeController.js';
import { createHomeRouter } from './home/interfaceAdapter/api/route/homeRoute.js';
import type { SkillSheetRepositoryInterface } from './skillsheets/domain/interface/skillSheetRepository.js';
import type { MasterReaderInterface } from './skillsheets/domain/interface/masterReader.js';
import type { SheetParaphraserInterface } from './skillsheets/domain/interface/sheetParaphraser.js';
import { GenerateSkillSheetUseCase } from './skillsheets/use-case/generateSkillSheet.js';
import { ListSkillSheetsUseCase } from './skillsheets/use-case/listSkillSheets.js';
import { GetSkillSheetForDownloadUseCase } from './skillsheets/use-case/getSkillSheetForDownload.js';
import { GetSkillSheetPreviewUseCase } from './skillsheets/use-case/getSkillSheetPreview.js';
import { SkillSheetController } from './skillsheets/interfaceAdapter/api/controller/skillSheetController.js';
import { createSkillSheetRouter } from './skillsheets/interfaceAdapter/api/route/skillSheetRoute.js';
import {
  InMemorySkillSheetRepository,
  seedSkillSheets,
} from './skillsheets/infra/repository/inMemorySkillSheetRepository.js';
import { FakeSheetParaphraser } from './skillsheets/infra/paraphraser/fakeSheetParaphraser.js';
import type { TemplateRepositoryInterface } from './templates/domain/interface/templateRepository.js';
import type { UserContextReaderInterface } from './templates/domain/interface/userContextReader.js';
import { UploadTemplateUseCase } from './templates/use-case/uploadTemplate.js';
import { ActivateTemplateUseCase } from './templates/use-case/activateTemplate.js';
import { ListTemplatesUseCase } from './templates/use-case/listTemplates.js';
import { TemplateController } from './templates/interfaceAdapter/api/controller/templateController.js';
import { createTemplateRouter } from './templates/interfaceAdapter/api/route/templateRoute.js';
import { InMemoryTemplateRepository, seedTemplates } from './templates/infra/repository/inMemoryTemplateRepository.js';
import type { ProjectRepositoryInterface } from './projects/domain/interface/projectRepository.js';
import type { ProjectLinkerInterface } from './reports/domain/interface/projectLinker.js';
import { LinkReportProjectsUseCase } from './projects/use-case/linkReportProjects.js';
import { InMemoryProjectRepository, seedProjects } from './projects/infra/repository/inMemoryProjectRepository.js';
import type { MasterSummaryRepositoryInterface } from './master-summaries/domain/interface/masterSummaryRepository.js';
import type { MasterReconcilerInterface } from './reports/domain/interface/masterReconciler.js';
import { ReconcileMasterUseCase } from './master-summaries/use-case/reconcileMaster.js';
import { InMemoryMasterSummaryRepository } from './master-summaries/infra/repository/inMemoryMasterSummaryRepository.js';

export interface AppDependencies {
  greetingRepository: GreetingRepositoryInterface;
  /** 省略時は seed 済みのインメモリ実装を使う（既存テストの createApp 呼び出しを不変に保つため）。 */
  reportRepository?: ReportRepositoryInterface;
  /** 省略時は seed 済み（staff01/staff02）のインメモリ実装を使う（slice-06 認証・認可）。 */
  userRepository?: UserRepositoryInterface;
  /** 省略時は決定的フェイク。実プロバイダ実装はここに注入して差し替える（提供元非依存・slice-02 AC-2）。 */
  summarizer?: SummarizerInterface;
  /** 省略時は空のインメモリ実装（生成物の保存・履歴／slice-08）。 */
  skillSheetRepository?: SkillSheetRepositoryInterface;
  /** 省略時は seed 済み合成マスターのインメモリ read ポート（slice-08・オラクル parity）。 */
  masterReader?: MasterReaderInterface;
  /** 省略時は決定的フェイク。実プロバイダ実装はここに注入して差し替える（提供元非依存・slice-08 AC-2）。 */
  sheetParaphraser?: SheetParaphraserInterface;
  /** 省略時は seed 済み（grp_synth_eng の2版）のインメモリ実装（slice-10・オラクル parity）。 */
  templateRepository?: TemplateRepositoryInterface;
  /** 省略時は seed 済み（p_seed）のインメモリ実装（slice-11・案件紐づけ）。 */
  projectRepository?: ProjectRepositoryInterface;
  /** 省略時は空のインメモリ実装（slice-12・突合済みマスター）。 */
  masterSummaryRepository?: MasterSummaryRepositoryInterface;
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
  const userRepository = deps.userRepository ?? defaultUserRepository();
  const summarizer = deps.summarizer ?? new FakeSummarizer();
  const skillSheetRepository = deps.skillSheetRepository ?? defaultSkillSheetRepository();
  const masterReader = deps.masterReader ?? defaultMasterReader();
  const sheetParaphraser = deps.sheetParaphraser ?? new FakeSheetParaphraser();
  const templateRepository = deps.templateRepository ?? defaultTemplateRepository();
  const projectRepository = deps.projectRepository ?? defaultProjectRepository();
  const masterSummaryRepository = deps.masterSummaryRepository ?? new InMemoryMasterSummaryRepository();
  const generateId = deps.generateId ?? (() => randomUUID());
  const clock = deps.clock ?? (() => new Date());

  // 確定時の案件紐づけポート（slice-11）。フィーチャー間 import を避け、projects の use-case を
  // reports のポートに適合させて注入する（home の reportSummaryReader と同型・合成ルートのみが跨げる）。
  const linkReportProjects = new LinkReportProjectsUseCase(projectRepository, generateId);
  const projectLinker: ProjectLinkerInterface = {
    link: (input) => linkReportProjects.execute(input),
  };
  // 確定時の突合ポート（slice-12・ADR-0019）。master-summaries の use-case を reports のポートに適合させて注入。
  const reconcileMaster = new ReconcileMasterUseCase(masterSummaryRepository, clock);
  const masterReconciler: MasterReconcilerInterface = {
    reconcile: (input) => reconcileMaster.execute(input),
  };

  const greetingController = new GreetingController(new GetGreetingUseCase(greetingRepository, generateId, clock));
  const reportController = new ReportController(
    new CreateDraftUseCase(reportRepository, generateId),
    new UpdateDraftUseCase(reportRepository),
    new GetDraftUseCase(reportRepository),
    new SummarizeReportUseCase(reportRepository, summarizer),
    new ConfirmReportUseCase(reportRepository, projectLinker, masterReconciler),
    new ListReportsUseCase(reportRepository),
    new LoadOwnedReportUseCase(reportRepository),
    new GetPreviousReportUseCase(reportRepository),
  );
  const authController = new AuthController(
    new AuthGoogleCallbackUseCase(userRepository),
    new GetMeUseCase(userRepository),
  );
  // home の read 専用ポート。reports 本体には触れず、reportRepository を薄くラップして
  // 状態判定に必要な最小ビュー（id・status）だけを読む（依存は read 経由でのみ隔離・slice-07 §3）。
  const reportSummaryReader: ReportSummaryReaderInterface = {
    findDraftByUser: async (userId) => {
      const draft = await reportRepository.findDraftByUser(userId);
      return draft ? { id: draft.id, status: draft.status } : null;
    },
    findAllByUser: async (userId) => {
      const reports = await reportRepository.findAllByUser(userId);
      return reports.map((r) => ({ id: r.id, status: r.status }));
    },
  };
  const homeController = new HomeController(new GetHomeUseCase(reportSummaryReader));
  const skillSheetController = new SkillSheetController(
    new GenerateSkillSheetUseCase(masterReader, sheetParaphraser, skillSheetRepository, generateId, clock),
    new ListSkillSheetsUseCase(skillSheetRepository),
    new GetSkillSheetForDownloadUseCase(skillSheetRepository),
    new GetSkillSheetPreviewUseCase(skillSheetRepository),
  );
  // templates の認可 read ポート（slice-10 §3「use-case で user.role を read」）。auth 本体には触れず、
  // userRepository を薄くラップして role・group_id だけを読む（home の reportSummaryReader と同型）。
  const userContextReader: UserContextReaderInterface = {
    findByUser: async (userId) => {
      const u = await userRepository.findById(userId);
      return u ? { role: u.role, groupId: u.group_id ?? null } : null;
    },
  };
  const templateController = new TemplateController(
    new UploadTemplateUseCase(templateRepository, userContextReader, generateId, clock),
    new ActivateTemplateUseCase(templateRepository, userContextReader),
    new ListTemplatesUseCase(templateRepository, userContextReader),
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
  // 公開: OAuth コールバック（許可外ドメインは use-case が 403）。認証ミドルウェアを通さない。
  app.use('/auth', createAuthRouter({ authController }));
  // 保護: 未認証は requireAuth が 401（AC-3）。
  app.use('/me', requireAuth, createMeRouter({ authController }));
  // reports は各ハンドラが authUserId で 401 を担保（slice-04）。所有権 403 は use-case（AC-4）。
  app.use('/reports', createReportRouter({ reportController }));
  // 保護: home ハンドラが authUserId で 401 を担保（slice-07）。集約は read ポート経由でのみ reports を読む。
  app.use('/home', createHomeRouter({ homeController }));
  // skill-sheets は route の authUserId が 401 を担保（slice-08 AC-5）。所有権 403 は use-case。
  app.use('/skill-sheets', createSkillSheetRouter({ skillSheetController }));
  // templates は route の authUserId が 401 を担保（slice-10 AC-4）。manager 認可 403 は use-case（id 参照より先）。
  app.use('/templates', createTemplateRouter({ templateController }));
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

/** userRepository 未注入時の既定（seed 済み: staff01/staff02 のインメモリ）。 */
function defaultUserRepository(): UserRepositoryInterface {
  const repo = new InMemoryUserRepository();
  seedUsers(repo);
  return repo;
}

/**
 * projectRepository 未注入時の既定（seed 済みインメモリ・slice-11）。
 * seed `p_seed`（staff01 の既存案件）はオラクル(server.mjs)と同一＝AC-1「既存案件へ紐づけ」の観測源。
 */
function defaultProjectRepository(): ProjectRepositoryInterface {
  const repo = new InMemoryProjectRepository();
  seedProjects(repo);
  return repo;
}

/**
 * templateRepository 未注入時の既定（seed 済みインメモリ・slice-10）。
 * seed（grp_synth_eng の tpl_seed_v1/v2）はオラクル(server.mjs:161-180)と同一＝版一覧・履歴・有効版切替の観測源。
 */
function defaultTemplateRepository(): TemplateRepositoryInterface {
  const repo = new InMemoryTemplateRepository();
  seedTemplates(repo);
  return repo;
}

/**
 * skillSheetRepository 未注入時の既定（seed 済みインメモリ・slice-09）。
 * seed（sk_seed_v1/v2・sk_other）はオラクル(server.mjs:75-99)と同一＝閲覧・履歴・DL・プレビューの観測源。
 * slice-08（生成）は空 Map で足りたが、slice-09（閲覧）は既存の生成済みシートを前提にするため seed する。
 */
function defaultSkillSheetRepository(): SkillSheetRepositoryInterface {
  const repo = new InMemorySkillSheetRepository();
  seedSkillSheets(repo);
  return repo;
}

/**
 * masterReader 未注入時の既定（seed 済み合成マスターのインメモリ read ポート・slice-08）。
 * 合成マスターの内容はオラクル(tools/reference-mock-server/server.mjs:57 masters)と同一（parity）。
 * 数値を含めない＝マスターに無い数値を創作しない検証源（AC-2）。実データとの突合は後続（slice-11/12）。
 * home の reportSummaryReader と同じく、合成ルートで組む read ポート（専用 infra ファイルは持たない）。
 */
function defaultMasterReader(): MasterReaderInterface {
  const masters = new Map<
    string,
    { staffName: string; summaryJson: { achievements: string[]; skills: string[]; issues: string[] } }
  >([
    [
      'staff01',
      {
        staffName: 'テスト太郎',
        summaryJson: { achievements: ['ダッシュボードの改修を担当'], skills: ['フロントエンド'], issues: [] },
      },
    ],
  ]);
  return {
    findByStaffId: async (staffId) => masters.get(staffId) ?? null,
  };
}
