import { createBrowserRouter } from 'react-router-dom';
import { GreetingPage } from './features/greeting';
import { ReportInputPage, ReportReviewPage, ReportListPage, ReportDetailPage } from './features/reports';
import { HomePage } from './features/home';
import { LoginPage, RequireAuth } from './features/auth';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GreetingPage />,
  },
  {
    // S1 ログイン（slice-06・public）
    path: '/login',
    element: <LoginPage />,
  },
  {
    // S2 スタッフ用ホーム（slice-07・保護）
    path: '/home',
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
  },
  {
    // S4 AI要約 確認・編集（slice-02 / slice-03・保護）。/reports/:id より前に置く。
    path: '/reports/new/review',
    element: (
      <RequireAuth>
        <ReportReviewPage />
      </RequireAuth>
    ),
  },
  {
    // S3 業務報告入力＋前回参照（slice-01 / slice-05・保護）
    path: '/reports/new',
    element: (
      <RequireAuth>
        <ReportInputPage />
      </RequireAuth>
    ),
  },
  {
    // S5 業務報告一覧（slice-04・保護）
    path: '/reports',
    element: (
      <RequireAuth>
        <ReportListPage />
      </RequireAuth>
    ),
  },
  {
    // S5 業務報告 詳細（slice-04・保護）
    path: '/reports/:id',
    element: (
      <RequireAuth>
        <ReportDetailPage />
      </RequireAuth>
    ),
  },
]);
