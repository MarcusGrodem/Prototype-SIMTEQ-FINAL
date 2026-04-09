import { createBrowserRouter, Navigate } from 'react-router';
import { DashboardLayout } from './components/DashboardLayout';
import { CTOLayout } from './components/CTOLayout';
import { QALayout } from './components/QALayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { MainDashboard } from './pages/MainDashboard';
import { RiskRegister } from './pages/RiskRegister';
import { ControlManagement } from './pages/ControlManagement';
import { ComplianceCalendar } from './pages/ComplianceCalendar';
// QA pages
import { QADashboard } from './pages/qa/QADashboard';
import { Evidence } from './pages/Evidence';
import { PolicyManagement } from './pages/qa/PolicyManagement';
// CTO pages
import { CTODashboard } from './pages/cto/CTODashboard';
import { ChangeLogPage } from './pages/cto/ChangeLog';
import { Releases } from './pages/cto/Releases';
import { AccessControl } from './pages/cto/AccessControl';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/',
    element: (
      <ProtectedRoute requiredRole="ceo">
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <MainDashboard /> },
      { path: 'risks', element: <RiskRegister /> },
      { path: 'controls', element: <ControlManagement /> },
      { path: 'calendar', element: <ComplianceCalendar /> }
    ]
  },
  {
    path: '/cto',
    element: (
      <ProtectedRoute requiredRole="cto">
        <CTOLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <CTODashboard /> },
      { path: 'changelog', element: <ChangeLogPage /> },
      { path: 'releases', element: <Releases /> },
      { path: 'access', element: <AccessControl /> }
    ]
  },
  {
    path: '/qa',
    element: (
      <ProtectedRoute requiredRole="qa">
        <QALayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <QADashboard /> },
      { path: 'controls', element: <ControlManagement /> },
      { path: 'evidence', element: <Evidence /> },
      { path: 'calendar', element: <ComplianceCalendar /> },
      { path: 'policies', element: <PolicyManagement /> }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]);
