import { createBrowserRouter } from 'react-router-dom';
import { GreetingPage } from './features/greeting';
import { ReportInputPage } from './features/reports';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GreetingPage />,
  },
  {
    // S3 業務報告入力（slice-01）
    path: '/reports/new',
    element: <ReportInputPage />,
  },
]);
