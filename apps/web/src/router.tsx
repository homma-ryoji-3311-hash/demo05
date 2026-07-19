import { createBrowserRouter } from 'react-router-dom';
import { GreetingPage } from './features/greeting';
import { ReportDetailPage, ReportInputPage, ReportListPage, ReportReviewPage } from './features/reports';
import { LoginPage, RequireAuth } from './features/auth';
import { HomePage } from './features/home';
import { SkillSheetListPage, BulkDownloadPage } from './features/skillsheets';
import { TemplateManagePage } from './features/templates';
import { AdminConsolePage, GroupSettingsPage } from './features/admin';
import { NotificationSettingsPage } from './features/notifications';
import { ApprovalConsolePage, PendingApprovalPage } from './features/staff-approval';
import { QuestionSetEditorPage } from './features/question-sets';

// 静的パス（/reports/new）は動的パス（/reports/:id）より優先される（react-router のランク付け）。
// 保護ルート（reports 配下）は RequireAuth で包む。未ログインは /login へ誘導（slice-06 UI-AC）。
export const router = createBrowserRouter([
  {
    path: '/',
    element: <GreetingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // S2 スタッフ用ホーム（slice-07）。保護ルート＝未ログインは /login へ（RequireAuth）。
    path: '/home',
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },
  {
    path: '/reports',
    element: (
      <RequireAuth>
        <ReportListPage />
      </RequireAuth>
    ),
  },
  {
    // S6 スキルシート閲覧（slice-09）。保護ルート＝未ログインは /login へ（RequireAuth）。
    path: '/skill-sheets',
    element: (
      <RequireAuth>
        <SkillSheetListPage />
      </RequireAuth>
    ),
  },
  {
    // S7 テンプレート管理（slice-10・manager）。保護ルート＝未ログインは /login へ（RequireAuth）。
    path: '/templates',
    element: (
      <RequireAuth>
        <TemplateManagePage />
      </RequireAuth>
    ),
  },
  {
    // S12 承認・担当紐付けコンソール（slice-17・super admin）。/admin/staff より具体的なので優先マッチ。
    path: '/admin/staff/pending',
    element: (
      <RequireAuth>
        <ApprovalConsolePage />
      </RequireAuth>
    ),
  },
  {
    // S8 グループ設定領域（slice-22・担当 manager）。/admin/staff より具体的でない別パス。専用画面ではなく S8 内領域。
    path: '/admin/group-settings',
    element: (
      <RequireAuth>
        <GroupSettingsPage />
      </RequireAuth>
    ),
  },
  {
    // S8 管理者コンソール/スタッフ一覧（slice-14・manager）。保護ルート＝未ログインは /login へ（RequireAuth）。
    path: '/admin/staff',
    element: (
      <RequireAuth>
        <AdminConsolePage />
      </RequireAuth>
    ),
  },
  {
    // 未承認スタッフの承認待ち画面（slice-17）。deny-by-default 中は自分の状態のみ read-only 参照。
    path: '/pending',
    element: (
      <RequireAuth>
        <PendingApprovalPage />
      </RequireAuth>
    ),
  },
  {
    // S10 設問テンプレート編集（slice-19・manager）。保護ルート＝未ログインは /login へ（RequireAuth）。
    path: '/question-sets',
    element: (
      <RequireAuth>
        <QuestionSetEditorPage />
      </RequireAuth>
    ),
  },
  {
    // S11 スキルシート一括ダウンロード（slice-21・manager）。保護ルート＝未ログインは /login へ（RequireAuth）。
    path: '/bulk-download',
    element: (
      <RequireAuth>
        <BulkDownloadPage />
      </RequireAuth>
    ),
  },
  {
    // S9 通知設定（slice-13）。保護ルート＝未ログインは /login へ（RequireAuth）。
    path: '/notification-settings',
    element: (
      <RequireAuth>
        <NotificationSettingsPage />
      </RequireAuth>
    ),
  },
  {
    path: '/reports/new',
    element: (
      <RequireAuth>
        <ReportInputPage />
      </RequireAuth>
    ),
  },
  {
    path: '/reports/new/review',
    element: (
      <RequireAuth>
        <ReportReviewPage />
      </RequireAuth>
    ),
  },
  {
    path: '/reports/:id',
    element: (
      <RequireAuth>
        <ReportDetailPage />
      </RequireAuth>
    ),
  },
]);
