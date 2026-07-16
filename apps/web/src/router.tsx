import { createBrowserRouter } from 'react-router-dom';
import { GreetingPage } from './features/greeting';
import { ReportInputPage, ReportReviewPage } from './features/reports';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GreetingPage />,
  },
  {
    path: '/reports/new',
    element: <ReportInputPage />,
  },
  {
    path: '/reports/new/review',
    element: <ReportReviewPage />,
  },
]);
