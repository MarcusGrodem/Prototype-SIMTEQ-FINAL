# App Page Architecture

## Summary

- Total routed app pages across role views: 31.
- CEO pages: 10 routed, 10 registered in sidebar.
- CTO pages: 7 routed, 7 registered in sidebar.
- QA pages: 14 routed, 14 registered in sidebar.
- System routes outside role views: `/login` renders `LoginPage`; `*` redirects to `/login`.
- Runtime access is enforced by `ProtectedRoute` using the signed-in user's `profiles.role`.
- Shared components/pages: `ControlManagement`, `ComplianceCalendar`, and `Evidence` are reused across role-prefixed routes where relevant.
- Pages in sidebar vs route-only: no CEO/CTO/QA page is route-only. Login and wildcard redirect are system route-only entries.

## CEO View

| Group | Label | Route | Component | Purpose | Notes |
|---|---|---|---|---|---|
| Dashboard | Overview | `/` | `MainDashboard` | Executive risk/control dashboard with KPIs, alerts, risk matrix, recent controls, auditor export, and ISAE 3402 report generation. | CEO-only. Keeps links to CEO audit oversight drilldowns. |
| Dashboard | Type 2 Readiness | `/readiness` | `Type2ReadinessPage` | Executive readiness score, Type 2 KPI breakdown, monthly trend, and action-required summary. | CEO-only. |
| Controls & Risks | Controls | `/controls` | `ControlManagement` | Executive visibility into control register and control evidence status. | Shared component with CTO and QA. |
| Controls & Risks | Risks | `/risks` | `RiskRegister` | Executive risk register and risk scoring oversight. | CEO-only. |
| Evidence & Audit | Audit Periods | `/audit-period` | `AuditPeriodPage` | Audit period oversight and execution generation/sync controls. | Shared component with QA at `/qa/audit-period`. |
| Evidence & Audit | Evidence Review | `/evidence-review` | `EvidenceReviewQueue` | Executive evidence review visibility and approval workflow. | Shared component with QA at `/qa/evidence-review`. |
| Evidence & Audit | Deviations | `/deviations` | `DeviationRegister` | Executive deviation/remediation oversight. | Shared component with QA at `/qa/deviations`. |
| Evidence & Audit | Auditor Requests | `/auditor-requests` | `AuditorRequestTracker` | Auditor request status and overdue request oversight. | Shared component with QA at `/qa/auditor-requests`. |
| Evidence & Audit | Period End | `/period-end` | `PeriodEndPage` | Period closeout, auditor pack, and management assertion. | CEO-only. |
| Governance | Users | `/users` | `UserManagementPage` | User invitation and role/profile management. | CEO-only. |

## CTO View

| Group | Label | Route | Component | Purpose | Notes |
|---|---|---|---|---|---|
| Dashboard | Overview | `/cto` | `CTODashboard` | Engineering compliance overview with recent changes, releases, and change status breakdown. | CTO-only. |
| Technical Compliance | Controls | `/cto/controls` | `ControlManagement` | Technical control register visibility and evidence upload access. | Shared component. CTO-prefixed route. |
| Technical Compliance | Evidence | `/cto/evidence` | `Evidence` | Technical evidence/document management. | Shared component with QA. |
| Technical Compliance | Calendar | `/cto/calendar` | `ComplianceCalendar` | Technical compliance schedule and upcoming control deadlines. | Shared component. |
| Engineering | Change Log | `/cto/changelog` | `ChangeLogPage` | Change-management register and approvals. | CTO-only. |
| Engineering | Releases | `/cto/releases` | `Releases` | Product/release management and changelog export. | CTO-only. |
| Engineering | Access | `/cto/access` | `AccessControl` | Access-control role audit trail and user role updates. | CTO-only. |

## QA View

| Group | Label | Route | Component | Purpose | Notes |
|---|---|---|---|---|---|
| Dashboard | Overview | `/qa` | `QADashboard` | QA compliance overview with control status, deadlines, and recent evidence uploads. | QA-only. |
| Compliance | Controls | `/qa/controls` | `ControlManagement` | Day-to-day control management and evidence upload. | Shared component. QA-prefixed route. |
| Compliance | RCM | `/qa/rcm` | `ControlObjectivesPage` | Control objectives library and risk-control matrix maintenance. | Moved from CEO into QA operations. |
| Compliance | Categories | `/qa/categories` | `RiskCategoriesPage` | Category taxonomy maintenance. | Moved from CEO into QA operations. |
| Compliance | Calendar | `/qa/calendar` | `ComplianceCalendar` | Compliance calendar and upcoming deadlines. | Shared component. |
| Compliance | Policies | `/qa/policies` | `PolicyManagement` | Policy library, ownership, versioning, and review tracking. | QA-only. |
| Evidence & Audit | Evidence | `/qa/evidence` | `Evidence` | Evidence/document management, versions, links, and uploads. | Shared with CTO. |
| Evidence & Audit | Audit Periods | `/qa/audit-period` | `AuditPeriodPage` | Audit period execution setup and overdue sync. | Shared component with CEO. |
| Evidence & Audit | Evidence Review | `/qa/evidence-review` | `EvidenceReviewQueue` | Evidence approval/rejection workflow. | Shared component with CEO. |
| Evidence & Audit | Deviations | `/qa/deviations` | `DeviationRegister` | Deviation logging and remediation workflow. | Shared component with CEO. |
| Evidence & Audit | Auditor Requests | `/qa/auditor-requests` | `AuditorRequestTracker` | Auditor request intake, owner assignment, response, and status tracking. | Shared component with CEO. |
| Evidence & Audit | Data Import | `/qa/data-import` | `DataImportPage` | CSV/TSV/XLS import workbench for operational compliance data. | Moved from CEO into QA operations. |
| Evidence & Audit | Report Template | `/qa/report-template` | `ReportTemplateEditor` | Audit report template and section configuration. | Moved from CEO into QA operations. |
| Evidence & Audit | Notifications | `/qa/notifications` | `NotificationLogPage` | Notification and alert history. | Moved from CEO into QA operations. |

## Shared Pages

- `ControlManagement`: CEO `/controls`, CTO `/cto/controls`, QA `/qa/controls`.
- `ComplianceCalendar`: CTO `/cto/calendar`, QA `/qa/calendar`.
- `Evidence`: CTO `/cto/evidence`, QA `/qa/evidence`.
- Type 2 execution/review pages are shared between CEO oversight and QA operations where drilldown visibility is needed: Audit Periods, Evidence Review, Deviations, and Auditor Requests.
- CEO no longer owns RCM, Categories, Calendar, Data Import, Report Template, or Notifications.

## Navigation Registry

- `GROUPS` defines fixed sidebar groups by role.
- `ALL_PAGES` defines every sidebar-eligible page with role view, route href, icon, and group.
- `VIEW_DEFAULTS` makes every page for the active role visible by default.
- `useSidebarConfig` filters saved sidebar config to the current role and appends newly introduced role pages.
- `SidebarNav` renders single-page groups as flat links and multi-page groups as collapsible sections.
- `ProtectedRoute` enforces `requiredRole`; users opening another role route are redirected to their own role landing page.
- `SidebarRoleSwitcher` and `ViewSwitcher` no longer show universal cross-role links.

## Gaps / Recommendations

- Route/sidebar mismatches: none found after redistribution.
- Route-only role pages: none.
- Sidebar-only role pages: none.
- CEO is capped at 10 pages. It keeps the executive dashboard, readiness, key risk/control visibility, core audit oversight drilldowns, period end, and user governance.
- CEO still has audit drilldown pages because `MainDashboard`, `Type2ReadinessPage`, and `PeriodEndPage` link to those workflows.
- If CEO should become summary-only, those drilldowns need role-aware destinations or read-only summary components.
- QA `Evidence & Audit` is now large; consider splitting into `Audit Execution` and `Evidence Review` if more audit workflow pages are added.
