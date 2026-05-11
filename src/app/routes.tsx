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
import { RiskCategoriesPage } from './pages/RiskCategoriesPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { ReportTemplateEditor } from './pages/ReportTemplateEditor';
import { NotificationLogPage } from './pages/NotificationLogPage';
import { AuditPeriodPage } from './pages/AuditPeriodPage';
import { EvidenceReviewQueue } from './pages/EvidenceReviewQueue';
import { DeviationRegister } from './pages/DeviationRegister';
import { Type2ReadinessPage } from './pages/Type2ReadinessPage';
import { ControlObjectivesPage } from './pages/ControlObjectivesPage';
import { AuditorRequestTracker } from './pages/AuditorRequestTracker';
import { PeriodEndPage } from './pages/PeriodEndPage';
import { DataImportPage } from './pages/DataImportPage';
// QA pages
import { QADashboard } from './pages/qa/QADashboard';
import { Evidence } from './pages/Evidence';
import { PolicyManagement } from './pages/qa/PolicyManagement';
// CTO pages
import { CTODashboard } from './pages/cto/CTODashboard';
import { ChangeLogPage } from './pages/cto/ChangeLog';
import { Releases } from './pages/cto/Releases';
import { AccessControl } from './pages/cto/AccessControl';

const CEO_ROUTES = [
  { index: true, element: <MainDashboard /> },
  { path: 'readiness', element: <Type2ReadinessPage /> },

  { path: 'controls', element: <ControlManagement /> },
  { path: 'risks', element: <RiskRegister /> },

  { path: 'audit-period', element: <AuditPeriodPage /> },
  { path: 'evidence-review', element: <EvidenceReviewQueue /> },
  { path: 'deviations', element: <DeviationRegister /> },
  { path: 'auditor-requests', element: <AuditorRequestTracker /> },
  { path: 'period-end', element: <PeriodEndPage /> },
  { path: 'report-template', element: <ReportTemplateEditor /> },

  { path: 'users', element: <UserManagementPage /> }
];

const CTO_ROUTES = [
  { index: true, element: <CTODashboard /> },
  { path: 'controls', element: <ControlManagement /> },
  { path: 'evidence', element: <Evidence /> },
  { path: 'calendar', element: <ComplianceCalendar /> },
  { path: 'changelog', element: <ChangeLogPage /> },
  { path: 'releases', element: <Releases /> },
  { path: 'access', element: <AccessControl /> }
];

const QA_ROUTES = [
  { index: true, element: <QADashboard /> },
  { path: 'controls', element: <ControlManagement /> },
  { path: 'rcm', element: <ControlObjectivesPage /> },
  { path: 'categories', element: <RiskCategoriesPage /> },
  { path: 'evidence', element: <Evidence /> },
  { path: 'evidence-review', element: <EvidenceReviewQueue /> },
  { path: 'deviations', element: <DeviationRegister /> },
  { path: 'auditor-requests', element: <AuditorRequestTracker /> },
  { path: 'audit-period', element: <AuditPeriodPage /> },
  { path: 'data-import', element: <DataImportPage /> },
  { path: 'report-template', element: <ReportTemplateEditor /> },
  { path: 'notifications', element: <NotificationLogPage /> },
  { path: 'calendar', element: <ComplianceCalendar /> },
  { path: 'policies', element: <PolicyManagement /> }
];

const ROLE_ROUTE_SECTIONS = [
  {
    path: '/',
    requiredRole: 'ceo',
    layout: <DashboardLayout />,
    children: CEO_ROUTES
  },
  {
    path: '/cto',
    requiredRole: 'cto',
    layout: <CTOLayout />,
    children: CTO_ROUTES
  },
  {
    path: '/qa',
    requiredRole: 'qa',
    layout: <QALayout />,
    children: QA_ROUTES
  }
];

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  ...ROLE_ROUTE_SECTIONS.map(({ path, requiredRole, layout, children }) => ({
    path,
    element: (
      <ProtectedRoute requiredRole={requiredRole}>
        {layout}
      </ProtectedRoute>
    ),
    children
  })),
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]);
