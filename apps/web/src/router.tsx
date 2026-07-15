import { createBrowserRouter } from 'react-router-dom';
import { GreetingPage } from './features/greeting';
import { ReportInputPage, ReportReviewPage, ReportListPage, ReportDetailPage } from './features/reports';
import { HomePage } from './features/home';
import { LoginPage } from './features/auth';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GreetingPage />,
  },
  {
    // S1 ログイン（slice-06）
    path: '/login',
    element: <LoginPage />,
  },
  {
    // S2 スタッフ用ホーム（slice-07）
    path: '/home',
    element: <HomePage />,
  },
  {
    // S4 AI要約 確認・編集（slice-02 / slice-03）。/reports/:id より前に置く。
    path: '/reports/new/review',
    element: <ReportReviewPage />,
  },
  {
    // S3 業務報告入力＋前回参照（slice-01 / slice-05）
    path: '/reports/new',
    element: <ReportInputPage />,
  },
  {
    // S5 業務報告一覧（slice-04）
    path: '/reports',
    element: <ReportListPage />,
  },
  {
    // S5 業務報告 詳細（slice-04）
    path: '/reports/:id',
    element: <ReportDetailPage />,
  },
]);
