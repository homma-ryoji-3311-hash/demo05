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
import type { AdminStaffReaderInterface } from './admin/domain/interface/adminStaffReader.js';
import type { ManagerContextReaderInterface } from './admin/domain/interface/managerContextReader.js';
import { ListAdminStaffUseCase } from './admin/use-case/listAdminStaff.js';
import { AdminController } from './admin/interfaceAdapter/api/controller/adminController.js';
import { createAdminRouter } from './admin/interfaceAdapter/api/route/adminRoute.js';
import { InMemoryAdminStaffReader } from './admin/infra/repository/inMemoryAdminStaffReader.js';
import type { ReportStatusRepositoryInterface } from './report-status/domain/interface/reportStatusRepository.js';
import type { ActorContextReaderInterface } from './report-status/domain/interface/actorContextReader.js';
import { SetReportCycleUseCase, GetReportCycleUseCase } from './report-status/use-case/setReportCycle.js';
import { ViewMyReportStatusUseCase } from './report-status/use-case/viewMyReportStatus.js';
import { FlagMissingUseCase, ApproveAbsenceUseCase } from './report-status/use-case/mutateReportStatus.js';
import { ReportStatusController } from './report-status/interfaceAdapter/api/controller/reportStatusController.js';
import {
  createAdminReportStatusRouter,
  createMyReportStatusRouter,
} from './report-status/interfaceAdapter/api/route/reportStatusRoute.js';
import {
  InMemoryReportStatusRepository,
  seedReportStatus,
} from './report-status/infra/repository/inMemoryReportStatusRepository.js';
import type { NotificationSettingsRepositoryInterface } from './notifications/domain/interface/notificationSettingsRepository.js';
import type { UserTimezoneReaderInterface } from './notifications/domain/interface/userTimezoneReader.js';
import { GetNotificationSettingsUseCase } from './notifications/use-case/getNotificationSettings.js';
import { UpdateNotificationSettingsUseCase } from './notifications/use-case/updateNotificationSettings.js';
import { NotificationSettingsController } from './notifications/interfaceAdapter/api/controller/notificationSettingsController.js';
import { createNotificationSettingsRouter } from './notifications/interfaceAdapter/api/route/notificationSettingsRoute.js';
import { InMemoryNotificationSettingsRepository } from './notifications/infra/repository/inMemoryNotificationSettingsRepository.js';
import type { ReminderTargetReaderInterface } from './reminders/domain/interface/reminderTargetReader.js';
import type { NotifierInterface } from './reminders/domain/interface/notifier.js';
import { RunReminderJobUseCase } from './reminders/use-case/runReminderJob.js';
import { ReminderController } from './reminders/interfaceAdapter/api/controller/reminderController.js';
import { createReminderRouter } from './reminders/interfaceAdapter/api/route/reminderRoute.js';
import {
  InMemoryReminderTargetReader,
  seedReminderTargets,
} from './reminders/infra/repository/inMemoryReminderTargetReader.js';
import { FakeNotifier } from './reminders/infra/notifier/fakeNotifier.js';
import type { StaffAccountRepositoryInterface } from './staff-approval/domain/interface/staffAccountRepository.js';
import type { ApproverContextReaderInterface } from './staff-approval/domain/interface/approverContextReader.js';
import { ListPendingStaffUseCase } from './staff-approval/use-case/listPendingStaff.js';
import { ApproveStaffUseCase } from './staff-approval/use-case/approveStaff.js';
import { StaffApprovalController } from './staff-approval/interfaceAdapter/api/controller/staffApprovalController.js';
import { createStaffApprovalRouter } from './staff-approval/interfaceAdapter/api/route/staffApprovalRoute.js';
import { denyByDefault } from './staff-approval/interfaceAdapter/api/middleware/denyByDefault.js';
import {
  InMemoryStaffAccountRepository,
  seedStaffAccounts,
} from './staff-approval/infra/repository/inMemoryStaffAccountRepository.js';
import type { QuestionSetRepositoryInterface } from './question-sets/domain/interface/questionSetRepository.js';
import type { ManagerContextReaderInterface as QuestionSetManagerReaderInterface } from './question-sets/domain/interface/managerContextReader.js';
import { CreateQuestionSetUseCase } from './question-sets/use-case/createQuestionSet.js';
import { UpdateQuestionSetUseCase } from './question-sets/use-case/updateQuestionSet.js';
import { GetQuestionSetUseCase } from './question-sets/use-case/getQuestionSet.js';
import { PublishQuestionSetUseCase } from './question-sets/use-case/publishQuestionSet.js';
import { QuestionSetController } from './question-sets/interfaceAdapter/api/controller/questionSetController.js';
import { createQuestionSetRouter } from './question-sets/interfaceAdapter/api/route/questionSetRoute.js';
import {
  InMemoryQuestionSetRepository,
  seedQuestionSets,
} from './question-sets/infra/repository/inMemoryQuestionSetRepository.js';

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
  /** 省略時は seed 済み（staff01 の5機会）のインメモリ実装（slice-15・オラクル parity）。 */
  reportStatusRepository?: ReportStatusRepositoryInterface;
  /** 省略時は seed 済み（合成スタッフ台帳 G1/G3/G2）のインメモリ実装（slice-14・オラクル parity）。 */
  adminStaffReader?: AdminStaffReaderInterface;
  /** 省略時は空のインメモリ実装（slice-13・通知設定・user_id 単位）。 */
  notificationSettingsRepository?: NotificationSettingsRepositoryInterface;
  /** 省略時は seed 済み（ru_tokyo/ru_sg/ru_done/ru_noslack）のインメモリ抽出源（slice-16・オラクル parity）。 */
  reminderTargetReader?: ReminderTargetReaderInterface;
  /** 省略時は決定的フェイク notifier（実送信ゼロ・sink 捕捉）。実 Slack/メールはここに注入（slice-16 PM 決定）。 */
  notifier?: NotifierInterface;
  /** 省略時は seed 済み（pend_ac1/2/3=pending）のインメモリ実装（slice-17・deny-by-default／承認）。 */
  staffAccountRepository?: StaffAccountRepositoryInterface;
  /** 省略時は seed 済み（qs_seed_v1）のインメモリ実装（slice-19・設問テンプレート・版管理）。 */
  questionSetRepository?: QuestionSetRepositoryInterface;
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
  const adminStaffReader = deps.adminStaffReader ?? new InMemoryAdminStaffReader();
  const reportStatusRepository = deps.reportStatusRepository ?? defaultReportStatusRepository();
  const notificationSettingsRepository =
    deps.notificationSettingsRepository ?? new InMemoryNotificationSettingsRepository();
  // slice-16: 抽出源は seed 済みインメモリ（オラクル parity）、notifier は既定でフェイク（実送信ゼロ）。
  const reminderTargetReader = deps.reminderTargetReader ?? new InMemoryReminderTargetReader(seedReminderTargets());
  const notifier = deps.notifier ?? new FakeNotifier();
  // slice-17: 承認状態ストア（deny-by-default／承認の源泉）。承認は super admin（approverContextReader）が判定。
  const staffAccountRepository = deps.staffAccountRepository ?? defaultStaffAccountRepository();
  const questionSetRepository = deps.questionSetRepository ?? defaultQuestionSetRepository();
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
  // slice-17: /me が承認状態を返すための seam。auth 本体はロールしか持たないので、承認状態は
  // staff-approval の staffAccountRepository から読む（レコードなし＝active・オラクル `status ?? 'active'` と同義）。
  const accountStatusReader = {
    getStatus: async (userId: string): Promise<string> =>
      (await staffAccountRepository.findById(userId))?.status ?? 'active',
  };
  const authController = new AuthController(
    new AuthGoogleCallbackUseCase(userRepository),
    new GetMeUseCase(userRepository, accountStatusReader),
  );
  // slice-17: 承認主体（super admin）を読む cross-module ポート。auth を薄くラップし role を読む（他の read ポートと同型）。
  const approverContextReader: ApproverContextReaderInterface = {
    isSuperAdmin: async (userId) => (await userRepository.findById(userId))?.role === 'super_admin',
  };
  const staffApprovalController = new StaffApprovalController(
    new ListPendingStaffUseCase(staffAccountRepository, approverContextReader),
    new ApproveStaffUseCase(staffAccountRepository, approverContextReader),
  );
  // slice-19: 設問セット操作は manager のみ。auth を薄くラップして role を読む（他の read ポートと同型）。
  const questionSetManagerReader: QuestionSetManagerReaderInterface = {
    isManager: async (userId) => (await userRepository.findById(userId))?.role === 'manager',
  };
  const questionSetController = new QuestionSetController(
    new CreateQuestionSetUseCase(questionSetRepository, questionSetManagerReader, generateId),
    new UpdateQuestionSetUseCase(questionSetRepository, questionSetManagerReader),
    new GetQuestionSetUseCase(questionSetRepository, questionSetManagerReader),
    new PublishQuestionSetUseCase(questionSetRepository, questionSetManagerReader),
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
  // 管理者コンソールの認可 read ポート（slice-14）。auth を薄くラップし role・担当グループ（複数）を読む。
  // groups は user.groups 優先・無ければ group_id を単一要素として扱う（オラクル managerGroups と同義・home の read ポートと同型）。
  const managerContextReader: ManagerContextReaderInterface = {
    findByUser: async (userId) => {
      const u = await userRepository.findById(userId);
      if (!u) return null;
      const groups = u.groups ?? (u.group_id ? [u.group_id] : []);
      return { role: u.role, groups };
    },
  };
  const adminController = new AdminController(new ListAdminStaffUseCase(adminStaffReader, managerContextReader));
  // 報告状況の操作ロール read ポート（slice-15）。auth を薄くラップし manager かだけを読む（本人は read-only・AC-6）。
  const actorContextReader: ActorContextReaderInterface = {
    isManager: async (userId) => (await userRepository.findById(userId))?.role === 'manager',
  };
  const reportStatusController = new ReportStatusController(
    new SetReportCycleUseCase(reportStatusRepository, actorContextReader),
    new GetReportCycleUseCase(reportStatusRepository, actorContextReader),
    new ViewMyReportStatusUseCase(reportStatusRepository),
    new FlagMissingUseCase(reportStatusRepository, actorContextReader),
    new ApproveAbsenceUseCase(reportStatusRepository, actorContextReader),
  );
  // 通知設定の TZ read ポート（slice-13）。auth 本体には触れず userRepository を薄くラップして timezone だけを読む。
  // 未設定ユーザーは既定 Asia/Tokyo（オラクル userTz の `?? 'Asia/Tokyo'` と同義。合成のみ・home の read ポートと同型）。
  const userTimezoneReader: UserTimezoneReaderInterface = {
    getTimezone: async (userId) => {
      const u = (await userRepository.findById(userId)) as { timezone?: string } | null;
      return u?.timezone ?? 'Asia/Tokyo';
    },
  };
  const notificationSettingsController = new NotificationSettingsController(
    new GetNotificationSettingsUseCase(notificationSettingsRepository, userTimezoneReader),
    new UpdateNotificationSettingsUseCase(notificationSettingsRepository, userTimezoneReader),
  );
  // slice-16 リマインドジョブ。抽出（reader）→ 通知抽象化層（notifier）へ dispatch。実送信は notifier の背後。
  const reminderController = new ReminderController(new RunReminderJobUseCase(reminderTargetReader, notifier));

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
  // 本人の履行状況 read-only（slice-15 AC-6）。/me 配下・authUserId が 401 を担保。deny は掛けない（承認待ちも自分の状態を見られる）。
  app.use('/me', requireAuth, createMyReportStatusRouter({ reportStatusController }));
  // slice-17 deny-by-default: 未承認（pending）は保護ルート群で 403。requireAuth 後段の共通ガードとして各マウントに1回挿す。
  // /me・/auth・/api・/jobs（システム起点）には掛けない。承認で active になると通過する（AC-3）。
  const denyPending = denyByDefault(staffAccountRepository);
  // reports は各ハンドラが authUserId で 401 を担保（slice-04）。所有権 403 は use-case（AC-4）。
  app.use('/reports', denyPending, createReportRouter({ reportController }));
  // 保護: home ハンドラが authUserId で 401 を担保（slice-07）。集約は read ポート経由でのみ reports を読む。
  app.use('/home', denyPending, createHomeRouter({ homeController }));
  // skill-sheets は route の authUserId が 401 を担保（slice-08 AC-5）。所有権 403 は use-case。
  app.use('/skill-sheets', denyPending, createSkillSheetRouter({ skillSheetController }));
  // templates は route の authUserId が 401 を担保（slice-10 AC-4）。manager 認可 403 は use-case（id 参照より先）。
  app.use('/templates', denyPending, createTemplateRouter({ templateController }));
  // admin は route の authUserId が 401 を担保（slice-14 AC-4）。manager 認可 403 は use-case（可視範囲より先）。
  app.use('/admin', denyPending, createAdminRouter({ adminController }));
  // report-cycles / report-status 操作（slice-15・manager のみ）。/admin 配下・authUserId が 401 を担保。
  app.use('/admin', denyPending, createAdminReportStatusRouter({ reportStatusController }));
  // slice-17 承認待ち一覧・承認（super admin のみ）。/admin 配下・deny 後に use-case が super admin 認可を判定。
  app.use('/admin', denyPending, createStaffApprovalRouter({ staffApprovalController }));
  // notification-settings は route の authUserId が 401 を担保（slice-13 AC-4）。設定は user_id 単位（本人のみ）。
  app.use('/notification-settings', denyPending, createNotificationSettingsRouter({ notificationSettingsController }));
  // slice-19 設問テンプレート（manager のみ）。authUserId が 401・manager 認可 403 は use-case・ガードレール 422。
  app.use('/question-sets', denyPending, createQuestionSetRouter({ questionSetController }));
  // slice-16 リマインドジョブ trigger（背景ジョブ・システム起点につき per-user 認可なし・対象は reader が抽出）。
  app.use('/jobs', createReminderRouter({ reminderController }));
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
 * reportStatusRepository 未注入時の既定（seed 済みインメモリ・slice-15）。
 * 機会 seed（staff01 の opp_sub/late/missing/flag/absent）はオラクル(server.mjs opportunities)と同一＝5 ステータス遷移の観測源。
 */
function defaultReportStatusRepository(): ReportStatusRepositoryInterface {
  const repo = new InMemoryReportStatusRepository();
  seedReportStatus(repo);
  return repo;
}

/**
 * staffAccountRepository 未注入時の既定（seed 済みインメモリ・slice-17）。
 * seed（pend_ac1/2/3=pending）はオラクル(server.mjs users の status)と同一＝deny-by-default／承認の観測源。
 * pend_ac1 は never-approve（AC-4 の承認待ち一覧に必ず居る）。既存ユーザーはレコードなし＝active 扱い。
 */
function defaultStaffAccountRepository(): StaffAccountRepositoryInterface {
  const repo = new InMemoryStaffAccountRepository();
  seedStaffAccounts(repo);
  return repo;
}

/**
 * questionSetRepository 未注入時の既定（seed 済みインメモリ・slice-19）。
 * seed（qs_seed_v1・grp_engineer の published v1）はオラクル(server.mjs)と同一＝版管理（過去版不変）の観測源。
 */
function defaultQuestionSetRepository(): QuestionSetRepositoryInterface {
  const repo = new InMemoryQuestionSetRepository();
  seedQuestionSets(repo);
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
