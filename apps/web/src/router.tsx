import { createBrowserRouter } from 'react-router-dom';
import { GreetingPage } from './features/greeting';
import { ReportInputPage } from './features/reports';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GreetingPage />,
  },
  {
    path: '/reports/new',
    element: <ReportInputPage />,
  },
]);
