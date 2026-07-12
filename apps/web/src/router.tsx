import { createBrowserRouter } from 'react-router-dom';
import { GreetingPage } from './features/greeting';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <GreetingPage />,
  },
]);
