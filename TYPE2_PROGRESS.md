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
**Status: NOT STARTED**

Planned deliverables:
- Weighted readiness score (execution 25% + evidence 25% + approval 15% + exceptions 15% + remediation 10% + audit requests 5% + scope 5%)
- 8 executive KPI cards with RAG thresholds
- Monthly trend line for execution rate
- Replaces/extends current compliance % on MainDashboard

---

## MVP 5 — Auditor Export Pack
**Status: NOT STARTED**

Planned deliverables:
- Control Population CSV export
- Evidence Index CSV export
- Deviation Summary CSV export
- Extend AuditReportGenerator with these three exports

---

## Post-MVP backlog
**Status: NOT STARTED**

- Control objectives library + RCM view
- Auditor Request Tracker page
- Management Assertion page with period freeze
- KPI snapshot history (monthly cron → `kpi_snapshots` table)
- Audit log (Postgres triggers on key tables)
- Subservice org register
- CUEC register
- Access review workflow in CTO > Access Control
- Automated integrations (Jira, Entra ID)
