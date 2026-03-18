import { createBrowserRouter } from 'react-router';
import { DashboardLayout } from './components/DashboardLayout';
import { MainDashboard } from './pages/MainDashboard';
import { RiskRegister } from './pages/RiskRegister';
import { ControlManagement } from './pages/ControlManagement';
import { Evidence } from './pages/Evidence';
import { ComplianceCalendar } from './pages/ComplianceCalendar';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: DashboardLayout,
    children: [
      { index: true, Component: MainDashboard },
      { path: 'risks', Component: RiskRegister },
      { path: 'controls', Component: ControlManagement },
      { path: 'evidence', Component: Evidence },
      { path: 'calendar', Component: ComplianceCalendar }
    ]
  }
]);
