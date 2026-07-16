import { createBrowserRouter } from 'react-router-dom';
import { GreetingPage } from './features/greeting';
import { ReportDetailPage, ReportInputPage, ReportListPage, ReportReviewPage } from './features/reports';

// 静的パス（/reports/new）は動的パス（/reports/:id）より優先される（react-router のランク付け）。
export const router = createBrowserRouter([
  {
    path: '/',
    element: <GreetingPage />,
  },
  {
    path: '/reports',
    element: <ReportListPage />,
  },
  {
    path: '/reports/new',
    element: <ReportInputPage />,
  },
  {
    path: '/reports/new/review',
    element: <ReportReviewPage />,
  },
  {
    path: '/reports/:id',
    element: <ReportDetailPage />,
  },
]);
