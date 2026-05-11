# Type 2 Implementation Progress

Tracks what has been built toward ISAE 3402 Type 2 readiness.
Reference plan: `TYPE2_EXTENSION_PLAN.md`

---

## MVP 1 — Audit Period + Execution Records
**Status: COMPLETE**
**Date: 2026-05-05**

### Migration
- `supabase/migrations/2026_05_type2_mvp1.sql`
  - Created `audit_periods` table (name, start_date, end_date, freeze_date, report_due_date, status, auditor)
  - Created `control_executions` table (control_id, audit_period_id, scheduled_due_date, performed_date, performed_by_name, status, reviewer_status, reviewed_by_name, reviewed_date, comments)
  - Added `execution_id` column to `document_links` (links evidence to a specific execution)
  - Added `updated_at` triggers for both new tables

### Types (`src/lib/types.ts`)
- Added `AuditPeriod` interface
- Added `ControlExecution` interface
- Added `execution_id: string | null` to `DocumentLink`

### Context (`src/contexts/AuditPeriodContext.tsx`)
- `AuditPeriodProvider` loads all periods from Supabase on mount
- Exposes `activePeriod`, `allPeriods`, `loading`, `refresh` via `useAuditPeriod()`
- Mounted at app root in `src/main.tsx` (wraps all routes)

### Audit Period Settings page (`src/app/pages/AuditPeriodPage.tsx`)
- Route: `/audit-period` (CEO sidebar — "Audit Periods")
- Create and edit audit periods (name, start/end date, freeze date, report due date, auditor)
- Activate / Close period buttons (only one active period at a time)
- **Generate Executions** button: auto-creates `control_executions` stubs for all controls based on frequency
  - Monthly → one stub per month (last day of each month in period)
  - Quarterly → one stub per quarter end (Mar 31, Jun 30, Sep 30, Dec 31)
  - Yearly → one stub per year (Dec 31)
  - Re-runnable: deletes existing `scheduled` stubs before regenerating
- Active period progress bar and days remaining

### DashboardLayout sidebar (`src/app/components/DashboardLayout.tsx`)
- Active period indicator widget appears above "Customize sidebar"
- Shows period name, progress bar, days remaining
- Clicking it navigates to `/audit-period`

### ControlDetailsDialog (`src/app/components/ControlDetailsDialog.tsx`)
- New **Execution History** section shows all `control_executions` for the active period
- Status chips: scheduled / completed / overdue / failed / not_applicable
- Reviewer status chips: reviewed ✓ / rejected
- **Mark Done** button on scheduled/overdue executions — sets status=completed, performed_by_name, performed_date=today
- Definition of done: every control has a list of execution stubs; owners can mark them complete

---

## MVP 2 — Evidence per Execution + Review Workflow
**Status: COMPLETE**
**Date: 2026-05-05**

### Migration
- `supabase/migrations/2026_05_type2_mvp2.sql`
  - Added `reviewer_status` (pending | approved | rejected) to `documents`
  - Added `reviewer_comment`, `reviewed_by_name`, `reviewed_date` to `documents`

### Types (`src/lib/types.ts`)
- Added `reviewer_status`, `reviewer_comment`, `reviewed_by_name`, `reviewed_date` to `Document` interface

### Evidence Review Queue (`src/app/pages/EvidenceReviewQueue.tsx`)
- Route: `/evidence-review` (CEO sidebar — "Evidence Review")
- Three tabs: Pending Review / Approved / Rejected with counts
- Shows linked control IDs and execution badge per document
- **Approve** button: sets reviewer_status=approved, recorded reviewer + date
- **Reject** button: opens dialog for rejection comment, sets reviewer_status=rejected
- **Reset to pending** on approved/rejected documents
- Evidence approval rate % shown in page header
- KPI strip: pending / approved / rejected counts

### Evidence upload per execution (`src/app/components/ControlDetailsDialog.tsx`)
- After marking an execution complete, **Upload Evidence** button appears on that row
- File is uploaded to `evidence` bucket under `controls/{id}/executions/{exec_id}/`
- Document record created with `reviewer_status: 'pending'`
- `document_links` row created with both `link_type: control` and `execution_id` pointing to the specific execution

### Evidence Completeness Rate KPI (`src/app/pages/MainDashboard.tsx`)
- Added `useAuditPeriod()` to MainDashboard
- Queries completed executions for active period
- Queries `document_links` joined to `documents` where `reviewer_status = 'approved'` and `execution_id` in completed executions
- Calculates: approved-evidence executions / total completed executions × 100
- Shown as a 5th cell in the KPI strip (only when active period has completed executions)
- RAG colour: green ≥98%, amber 90–97%, red <90%
- Clicking navigates to `/evidence-review`

---

## MVP 3 — Deviation Register + Remediation
**Status: COMPLETE**
**Date: 2026-05-05**

### Migration
- `supabase/migrations/2026_05_type2_mvp3.sql`
  - Created `deviations` table (control_id, execution_id, audit_period_id, severity, type, description, detected_date, root_cause, audit_impact, status, owner_name)
  - Created `remediation_actions` table (deviation_id, action_description, owner_name, due_date, closed_date, closure_evidence, retest_required, retest_result, status)
  - RLS policies, indexes, updated_at triggers for both tables

### Types (`src/lib/types.ts`)
- Added `Deviation` interface
- Added `RemediationAction` interface

### Deviation Register (`src/app/pages/DeviationRegister.tsx`)
- Route: `/deviations` (CEO sidebar — "Deviations")
- KPI strip: Critical/Open count, Open total, Under Remediation, Closed
- Search + status filter + severity filter
- **Log Deviation** dialog: control selector, severity, type, description, detected date, owner, root cause, audit impact
- **Edit** dialog: update severity, status, owner, root cause, audit impact
- **Expand row** → inline Remediation Panel:
  - Add/update remediation: action description, owner, due date, retest required checkbox
  - **Mark Remediated** button: closes remediation, moves deviation to `closed` (or `retesting` if retest required)

### Auto-sync overdue → deviations (`src/app/pages/AuditPeriodPage.tsx`)
- **Sync Overdue** button on active period card
- Scans `control_executions` with status=scheduled and scheduled_due_date < today
- Creates `late_execution` deviations (severity=medium) for any not already logged
- Idempotent — skips executions that already have a deviation

### Open Deviation KPI (`src/app/pages/MainDashboard.tsx`)
- Queries open deviations (excludes closed + risk_accepted)
- Shows total open count + critical count in KPI strip
- RAG colour: red if critical > 0, orange if total > 0, neutral if none
- Clicking navigates to `/deviations`

---

## MVP 4 — Type 2 KPI Dashboard
**Status: COMPLETE**
**Date: 2026-05-09**

### Page (`src/app/pages/Type2ReadinessPage.tsx`)
- Route: `/readiness` (CEO sidebar — "Type 2 Readiness", `Gauge` icon)
- Scoped to `useAuditPeriod().activePeriod`; empty state when none active
- Header shows period name, dates, auditor, and period progress %

### Readiness Score hero card
- Weighted score 0–100 with RAG colour (green ≥90, amber 80–89, red <80)
- Formula:
  - Execution 25% + Evidence Completeness 25% + Evidence Approval 15% + Exceptions 15% + Remediation 10% + Audit Requests 5% + Scope Freshness 5%
  - Audit Requests + Scope Freshness default to 100 (placeholders until those features land)
  - Exception sub-score: 100 if none open, 70 if open but no critical, 30 if 1 critical, 0 if ≥2 critical
- Inline weighted breakdown — each component shown with its score and weight bar

### 8 executive KPI cards (`KpiCard`)
Drilldown link on every card:
- **Control Execution Rate** → `/audit-period` (G≥95, A 85–94, R<85)
- **On-Time Rate** → `/audit-period` (G≥95, A 85–94, R<85)
- **Evidence Completeness** → `/evidence-review` (G≥98, A 90–97, R<90)
- **Evidence Approval** → `/evidence-review` (G≥95, A 85–94, R<85)
- **Open Exceptions** → `/deviations` (G=0, A=any open, R=any critical)
- **Critical Exceptions** → `/deviations` (G=0, A=1, R≥2)
- **Remediation SLA** → `/deviations` (G≥90, A 75–89, R<75)
- **Period Coverage** → `/audit-period` (G=100, A≥80, R<80)

### Monthly trend chart
- Recharts `LineChart` of execution rate per period month
- Months enumerated from `activePeriod.start_date` → `end_date`
- Per-month rate = completed / scheduled in that month
- 95% target reference line (dashed green)
- Tooltip shows "rate% (completed/total)"

### Action Required banner
- Surfaces critical open deviations and overdue executions with deep links
- Renders only when `criticalDeviations > 0 || overdueExecutions > 0`

### MainDashboard hero link (`src/app/pages/MainDashboard.tsx`)
- Compliance Score hero card now links to `/readiness` when an active period exists (falls back to `/controls` when none)
- Adds a small "Type 2 Readiness →" affordance in the corner when active period is set

### Disclaimer
- Footer note: internal readiness indicator, does not replace external auditor's Type 2 testing

---

## MVP 5 — Auditor Export Pack
**Status: COMPLETE**
**Date: 2026-05-09**

Planned deliverables:
- Control Population CSV export — complete
- Evidence Index CSV export — complete
- Deviation Summary CSV export — complete
- Extend AuditReportGenerator with these three exports — complete

### Export helper foundation (`src/lib/type2AuditorExports.ts`)
- Added reusable Type 2 auditor export helpers independent from React components
- Fetches data scoped to `audit_period_id`
- Generates CSV content with safe CSV cell escaping and spreadsheet formula guard
- Provides browser download helper for generated CSV content
- Control Population rows include execution records joined with control metadata and evidence counts
- Evidence Index rows include execution-scoped evidence documents and review metadata
- Deviation Summary rows include deviations plus latest remediation action fields
- Added export pack builder returning all three CSVs with generated filenames

### AuditReportGenerator integration (`src/app/components/AuditReportGenerator.tsx`)
- Auditor CSV Pack section exports all three period-scoped CSVs from the active audit period
- Export buttons are disabled until an audit period is active
- Shows export progress and a failure message if CSV generation fails
- CSV filenames include the active period name and period date range

---

## Navigation Architecture Pass
**Status: COMPLETE**
**Date: 2026-05-09**

Information-architecture rework of the role sidebars after MVP 1–5 had grown the CEO sidebar to 12 flat items. Existing routes are preserved — this is a presentation/grouping change only.

### Group registry (`src/app/components/allPages.tsx`)
- Added `GROUPS` registry and `group` field on every `PageDef`
- New helper `buildSidebarTree(view, orderedPages)` returns `[{ group, pages }]` for a role
- Tightened labels: "Risk Register" → "Risks", "Risk Categories" → "Categories", "Notification Log" → "Notifications", "Access Control" → "Access", "Dashboard" (CEO) → "Overview"

### CEO sidebar (4 groups, was 12 flat)
- **Dashboard** — Overview, Type 2 Readiness
- **Controls & Risks** — Controls, Risks, RCM, Categories, Calendar
- **Evidence & Audit** — Audit Periods, Evidence Review, Deviations, Auditor Requests, Report Template
- **Governance** — Users, Notifications

### CTO sidebar (1 flat link + 1 group)
- **Dashboard** (single link) — Overview
- **Engineering** — Change Log, Releases, Access

### QA sidebar (1 flat link + 1 group)
- **Dashboard** (single link) — Overview
- **Compliance** — Controls, Evidence, Calendar, Policies

### Renderer (`src/app/components/SidebarNav.tsx`)
- Single-page groups render as a flat link (no header)
- Multi-page groups render with a small uppercase header + chevron (collapsible)
- Group containing the active route is always visually expanded
- User collapse preference persisted via `useSidebarGroups`

### Collapse-state hook (`src/app/hooks/useSidebarGroups.ts`)
- Per-user, per-role expanded state
- localStorage key: `sidebar_groups_v1_{view}_{userId}`
- Lazy: only stores explicit toggles — anything else defaults to expanded

### Customization stays page-level (`src/app/components/SidebarEditor.tsx`)
- Editor renders pages under their group label headings
- Reorder is clamped to within a group — moveUp/moveDown look up the nearest same-group neighbour and swap with it (`useSidebarConfig.moveUp/moveDown` are now group-aware)
- Hide/show toggles unchanged
- Existing `sidebar_v2_{view}_{userId}` localStorage entries continue to work (no migration needed; new pages are appended on load as before)

### Layouts (`DashboardLayout.tsx`, `CTOLayout.tsx`, `QALayout.tsx`)
- Replaced inline `<nav>` rendering with `<SidebarNav view={...} userId={user?.id} pages={visibleNav} />`
- Active period widget on CEO layout unchanged
- Role switcher unchanged

### Verification
- `npm run build` passes
- All existing routes resolve unchanged (no route renames)

### Tradeoffs / follow-ups
- Group membership is intentionally fixed in code, not user-configurable — keeps the IA stable as MVP 5+ pages land. Adding a new page is a one-line `group: 'grp_…'` assignment.
- "Action Required" surfacing remains on the Type 2 Readiness page and the CEO dashboard alerts banner — no new dedicated page was added.
- A future pass could add a global "Type 2 mode" toggle to hide audit-period-scoped pages when no period is active; deferred until needed.

---

## Post-MVP — Control Objectives Library + RCM
**Status: COMPLETE**
**Date: 2026-05-10**

### Migration
- `supabase/migrations/2026_05_type2_control_objectives_rcm.sql`
  - Created `control_objectives` table with title, description, risk area, evidence requirement, and in-scope flag
  - Added nullable `control_objective_id` to `controls`
  - Added indexes for objective scope, risk area, and control-objective mapping
  - Added authenticated RLS policy and updated_at trigger matching current project style

### Types (`src/lib/types.ts`)
- Added `ControlObjective` interface
- Added `control_objective_id: string | null` to `Control`

### Page (`src/app/pages/ControlObjectivesPage.tsx`)
- Route: `/rcm` (CEO sidebar, Controls & Risks group, label "RCM")
- Objective library supports create, edit, and in-scope/archive toggle
- RCM table shows objective, risk, control, frequency, owner, evidence requirement, execution status, exceptions, and reviewer status
- Control rows can be linked or unlinked from objectives inline
- Gap cards flag controls without objectives, high risks without active linked controls, and in-scope objectives without mapped controls

---

## Post-MVP — Auditor Request Tracker
**Status: COMPLETE**
**Date: 2026-05-10**

### Migration
- `supabase/migrations/2026_05_type2_auditor_requests.sql`
  - Created `auditor_requests` table scoped to `audit_period_id`
  - Fields: auditor, request text, related control, owner name, due date, status, response, submitted date
  - Status constraint: `open | answered | accepted | closed`
  - Added RLS policy for authenticated users
  - Added period, status, due date, and related-control indexes
  - Added `updated_at` trigger

### Types (`src/lib/types.ts`)
- Added `AuditorRequest` interface

### Auditor Requests page (`src/app/pages/AuditorRequestTracker.tsx`)
- Route: `/auditor-requests`
- Added to CEO sidebar under **Evidence & Audit**
- Scoped to the active audit period
- Empty state when no active period exists
- Status tabs: Open / Answered / Accepted / Closed
- Create request dialog with auditor, owner, related control, due date, submitted date, and initial response
- Respond/update dialog with quick actions to Answer, Accept, or Close
- Due, due-today, and overdue state shown on open requests

### Type 2 Readiness (`src/app/pages/Type2ReadinessPage.tsx`)
- Replaced the Audit Requests placeholder score with live `auditor_requests` data
- Score:
  - 100 if no open overdue requests
  - 80 if open requests exist but none are overdue
  - 50 if exactly one open request is overdue
  - 0 if more than one open request is overdue
- Existing weighted readiness formula remains unchanged

---

## Post-MVP — Management Assertion / Period-End
**Status: COMPLETE**
**Date: 2026-05-10**

### Migration
- `supabase/migrations/2026_05_type2_period_end.sql`
  - Added `frozen_at timestamptz` and `frozen_by_name text` columns to `audit_periods`
    - `status='closed'` continues to mean "period has ended"
    - `frozen_at` is the explicit management cut-off action (independent of close)
  - Created `management_assertions` table (audit_period_id, signer_name, signed_date, acknowledgement, notes, created_at/updated_at)
  - RLS policy and updated_at trigger matching the existing project pattern

### Types (`src/lib/types.ts`)
- Added `ManagementAssertion` interface
- Added `frozen_at` and `frozen_by_name` to `AuditPeriod`

### Shared readiness helpers (`src/lib/readinessMetrics.ts`)
- Extracted KPI calculation logic from `Type2ReadinessPage` into a shared module
  - `loadReadinessMetrics(periodId, start, end)` — period-scoped Supabase fetches
  - `computeReadinessKpis(metrics)` — pure weighted-score computation
  - `ragForPct`, `enumerateMonths`, `formatMonth`, `EMPTY_METRICS`, `ReadinessMetrics`, `ReadinessKpis`, `Rag`
- `Type2ReadinessPage` now consumes these helpers; numeric output is unchanged

### Period End page (`src/app/pages/PeriodEndPage.tsx`)
- Route: `/period-end` (CEO sidebar — **Evidence & Audit** group, label "Period End", `FileSignature` icon)
- Period summary header with readiness score chip
- 8 KPI snapshot table (compact tabular layout — denser than the Type 2 dashboard cards)
- Open exceptions list (top 10) and unresolved high risks list (Active risks with `risk_score >= 6`)
- Critical deviations callout when any are still open
- Auditor pack section: reuses MVP 5 CSV exports (Control Population / Evidence Index / Deviation Summary) and opens the existing `AuditReportGenerator` dialog
- Management assertion form: signer name, signed date, acknowledgement checkbox referencing live counts, optional notes — upserts a `management_assertions` row per period
- Empty state when no active audit period

### Period freeze
- "Freeze Period" button on the Period End page sets `audit_periods.frozen_at` (and `frozen_by_name` from the assertion signer)
- Frozen state is shown via a banner on the Period End page; evidence upload paths are unchanged so late submissions surface to the auditor as post-freeze additions
- Unfreeze button restores the period to non-frozen state

### Tradeoffs / follow-ups
- Hard-blocking evidence uploads when frozen was deliberately deferred — the existing upload flow (`ControlDetailsDialog`) is untouched. A follow-up could surface a "post-freeze" badge on documents uploaded after `frozen_at`.
- The acknowledgement checkbox does not enforce "all critical deviations closed"; it only references current counts in the prompt. Auditors can see open critical deviations in the pack.

---

## Post-MVP — KPI Snapshot History
**Status: COMPLETE**
**Date: 2026-05-11**

### Migration
- `supabase/migrations/2026_05_type2_kpi_snapshots.sql`
  - Created `kpi_snapshots` table:
    - `audit_period_id`
    - `snapshot_date`
    - `kpi_name`
    - `value`
    - `target`
    - `rag_status`
    - `created_at`
  - Added `rag_status` check constraint (`green | amber | red | neutral`)
  - Added unique constraint on `(audit_period_id, snapshot_date, kpi_name)` for upsert-safe captures
  - Added indexes for:
    - period/date history lookup
    - period/KPI/date trend lookup
    - created timestamp lookup
  - Added authenticated RLS policy matching the current project style

### Types (`src/lib/types.ts`)
- Added `KpiSnapshotRagStatus`
- Added `KpiSnapshot`

### Snapshot helpers (`src/lib/kpiSnapshots.ts`)
- Added reusable helpers next to the readiness metrics layer:
  - `buildKpiSnapshotRows(auditPeriodId, snapshotDate, metrics)`
    - Uses `computeReadinessKpis()` to derive stored KPI rows
    - Captures Type 2 Readiness Score plus the Period End KPI set
  - `saveKpiSnapshotSet(auditPeriodId, snapshotDate, metrics)`
    - Upserts rows for a period/date using the unique period/date/KPI key
  - `loadKpiSnapshotHistory(auditPeriodId)`
    - Loads and groups rows by `snapshot_date` for Period End display

### Period End page (`src/app/pages/PeriodEndPage.tsx`)
- Added manual **Capture Snapshot** action for the active audit period
- Added snapshot date input defaulting to today's date
- Added recent captured snapshot history panel:
  - readiness score from stored snapshot
  - number of red/at-risk KPIs
  - number of amber/watch KPIs
  - row count
  - capture timestamp
- Kept the live KPI table and readiness calculations unchanged
- No new sidebar page was added

### Remaining gaps
- Scheduled monthly capture is not implemented yet; current capture is manual from Period End.
- Snapshot rows store numeric values, targets, and RAG state only. They do not store each KPI's explanatory subtext or source population counts.

### Verification
- `npm run build` passes
- Existing Vite warnings remain:
  - `src/lib/supabase.ts` is both dynamically and statically imported
  - Main bundle is larger than the default 500 kB chunk warning threshold

---

## Post-MVP — Audit Log Foundation
**Status: COMPLETE**
**Date: 2026-05-11**

### Migration
- `supabase/migrations/2026_05_audit_log.sql`
  - `audit_log` table with `actor_id`, `actor_email`, `actor_name`, `action`, `table_name`, `record_id`, `before_data` jsonb, `after_data` jsonb, `source`, `context` jsonb, `created_at`.
  - Append-only RLS: authenticated select + insert, no update/delete policy.
  - `record_audit_log()` `security definer` trigger function uses `to_jsonb(NEW/OLD)` and records `auth.uid()` plus the JWT email claim where available. Skips no-op updates where `before = after`.
  - After-insert/update/delete triggers attached to `controls`, `risks`, `control_executions`, `documents`, `deviations`, `remediation_actions`, `auditor_requests`, `management_assertions`, `audit_periods`, and `import_runs`. The DO-block guards each `CREATE TRIGGER` behind an `information_schema.tables` check so the migration is re-runnable on partial schemas.

### Types (`src/lib/types.ts`)
- Added `AuditLogEntry`.

### UI (`src/app/components/AuditTrailPanel.tsx`)
- Reusable compact panel listing the latest audit log entries.
- Table filter (controls / risks / executions / documents / deviations / remediation / auditor requests / assertions / periods / import runs / all).
- Action badges per insert/update/delete, actor (email > name > truncated UUID > "System"), and a derived "Changed: …" summary that diffs `before_data` vs `after_data`, ignoring `created_at` / `updated_at`.
- Embedded in `PeriodEndPage` so CEO oversight can see live audit activity inside the existing closeout page — no new sidebar entry.

### Tradeoffs / follow-ups
- The trigger captures `auth.uid()` + JWT email, but does not join to `profiles` for display name. The UI prefers email and falls back to UUID prefix.
- RLS is broad-authenticated select; future hardening should scope reads by role.
- No retention or archive policy yet.
- Audit log is not yet used by Period End KPI snapshots or auditor exports.

---

## Post-MVP backlog
**Status: NOT STARTED**

- Scheduled monthly KPI snapshot capture
- Subservice org register
- CUEC register
- Access review workflow in CTO > Access Control
- Automated integrations (Jira, Entra ID)
- Audit log hardening: role-scoped RLS, actor name resolution, retention policy
