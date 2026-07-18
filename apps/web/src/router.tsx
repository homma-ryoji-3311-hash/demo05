import { createBrowserRouter } from 'react-router-dom';
import { GreetingPage } from './features/greeting';
import { ReportDetailPage, ReportInputPage, ReportListPage, ReportReviewPage } from './features/reports';
import { LoginPage, RequireAuth } from './features/auth';
import { HomePage } from './features/home';
import { SkillSheetListPage } from './features/skillsheets';
import { TemplateManagePage } from './features/templates';

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
