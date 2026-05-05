# Type 2 Extension Plan

> **Purpose:** Plan for extending the Simteq ISAE 3402 prototype from Type 1 (design documentation) to Type 2 (operating effectiveness tracking).
> This system supports readiness and audit preparation — it does not certify the organization or replace the external auditor's Type 2 report.

---

## 1. Summary

The prototype is a well-structured ISAE 3402 Type 1 foundation. It handles risk and control design, evidence uploads, multi-role access, and static ISAE 3402 report generation. To support Type 2, the platform must shift from a static design-documentation tool to an **operating effectiveness engine**: tracking whether controls actually ran, on time, with valid evidence, across a defined audit period.

The core additions are: (1) an audit period context, (2) per-execution control records replacing the single `last_execution` date, (3) a deviation and remediation register, (4) a KPI trend layer, and (5) an auditor-facing evidence export. The system should support readiness and audit preparation — it does not certify the organization.

---

## 2. Current Type 1 Capability

| Area | What exists today |
|---|---|
| Risk register | Full CRUD, likelihood/impact scoring, category, owner, linked controls |
| Control register | Full CRUD, frequency, owner, status, last_execution date, next_due |
| Evidence management | File upload to private Supabase bucket, versioning, link to risks/controls |
| Report generation | ISAE 3402 DOCX/PDF from template sections, domain-level assessments |
| Multi-role access | CEO, CTO, QA with role-gated views |
| Calendar | Compliance event calendar, reminders, next-due dates |
| Change log / releases | CTO change log with approval fields, release management |
| Policy register | Policy CRUD with version, owner, review dates |
| User management | Invite, role assignment, notification log |

**What is missing for Type 2:** an audit period as a first-class entity, repeated control execution records, a formal deviation register, KPI history snapshots, and auditor sampling support.

---

## 3. Type 2 Gaps

| Gap ID | Area | Current state | Type 2 requirement | Priority |
|---|---|---|---|---|
| G01 | Audit period | No concept | Defined start/end period; all execution and KPIs scoped to it | Critical |
| G02 | Control execution history | Single `last_execution` date per control | One record per control instance per period | Critical |
| G03 | Per-execution evidence | Evidence linked to control only | Evidence linked to a specific execution record | Critical |
| G04 | Evidence review workflow | Upload only; no reviewer approve/reject | Reviewer approves or rejects each evidence submission | Critical |
| G05 | Deviation register | No formal deviations; only overdue status | Formal deviation record per missed/failed/late execution | Critical |
| G06 | Remediation tracking | None | Remediation action with owner, due date, closure evidence | Critical |
| G07 | KPI time-series | Single-point dashboard stats | Monthly snapshots: execution rate, evidence completeness, exceptions | High |
| G08 | Readiness score | Compliance % (completed / total) | Weighted readiness score across execution, evidence, exceptions, remediation | High |
| G09 | Control objectives | No control objective entity | Objective library; controls linked to objectives | High |
| G10 | Audit request tracker | None | Auditor can submit requests; internal owner tracks and closes | High |
| G11 | Population / sample export | CSV of controls only | Full execution population export; sample selection support | High |
| G12 | Audit trail | No system-action log | Immutable log of who changed what, when | Medium |
| G13 | Management assertion page | None | Page showing period KPIs, exceptions, unresolved risks for sign-off | Medium |
| G14 | Control frequency auto-tasks | Manual status updates only | Auto-generate due execution records from frequency | Medium |
| G15 | Subservice org register | None | Vendor/subservice register with assurance report collection | Low |
| G16 | CUEC register | None | Customer-side controls linked to objectives | Low |

---

## 4. Prioritized Requirements

### P1 — Must have for Type 2 MVP

| ID | Requirement | Implementation note |
|---|---|---|
| R01 | Audit period management | New `audit_periods` table; period selector in CEO dashboard header |
| R09 | Control execution records | New `control_executions` table with status, performed_date, reviewer_status |
| R10 | Per-execution evidence upload | Evidence links to `control_execution_id`, not just `control_id` |
| R11 | Evidence review (approve/reject) | Reviewer workflow on ControlDetailsDialog or dedicated review queue |
| R07 | Control frequency → due dates | Auto-generate execution stubs per control per period based on frequency |
| R13 | Deviation register | New `deviations` table; auto-create on overdue/missing evidence |
| R14 | Remediation actions | New `remediation_actions` table linked to deviations |
| R16 | Audit trail / activity log | New `audit_log` table capturing all inserts/updates via Supabase triggers |

### P2 — Important but deferrable

| ID | Requirement | Implementation note |
|---|---|---|
| R04 | Control objective library | New `control_objectives` table; link controls to objectives |
| R06 | Risk-control matrix with objectives | Extend existing RCM view to show objectives column |
| R12 | Overdue control escalation | Auto-create deviations for executions past due date |
| R28 | Period-end report pack | Extend AuditReportGenerator with KPI history, deviation summary, evidence index |
| R15 | Auditor request tracker | New `auditor_requests` table + read-only auditor role support |
| R29 | Management assertion page | Summary page for CEO: period KPIs, open exceptions, sign-off status |

### P3 — Post-MVP enhancements

| ID | Requirement | Implementation note |
|---|---|---|
| R26 | Subservice org register | New `subservice_orgs` table with assurance report upload |
| R25 | CUEC register | New `cuecs` table linked to control objectives |
| R24 | Training/competence tracking | Extend UserManagement with training records |
| R19 | Incident management | Extend existing alerts into formal incident register |
| KPI | KPI snapshot history | Scheduled function writing monthly KPI rows to `kpi_snapshots` |
| INT | Automated integrations | Jira, Entra ID, GitHub imports (post-MVP) |

---

## 5. KPI Catalogue

### Executive readiness KPIs (CEO dashboard)

| KPI | Calculation | Target | Data source | RAG |
|---|---|---|---|---|
| **Type 2 Readiness Score** | Weighted: execution 25% + evidence 25% + approval 15% + exception 15% + remediation 10% + audit requests 5% + scope freshness 5% | ≥ 90% | All tables | G≥90, A 80–89, R<80 |
| **Control Execution Rate** | Executions with status Completed / total scheduled executions in period | ≥ 95% | `control_executions` | G≥95, A 85–94, R<85 |
| **On-Time Control Rate** | Executions completed before scheduled_due_date / completed executions | ≥ 95% | `control_executions` | G≥95, A 85–94, R<85 |
| **Evidence Completeness Rate** | Completed executions with at least one approved evidence / completed executions | ≥ 98% | `control_executions` + `documents` | G≥98, A 90–97, R<90 |
| **Evidence Approval Rate** | Approved evidence / submitted evidence in period | ≥ 95% | `documents` reviewer_status field | G≥95, A 85–94, R<85 |
| **Open Exception Count** | Deviations with status Open or Under Remediation | 0 critical | `deviations` | G=0 critical, A=1, R>1 |
| **Remediation SLA Compliance** | Remediations closed by due_date / total closed remediations | ≥ 90% | `remediation_actions` | G≥90, A 75–89, R<75 |
| **Period Coverage** | Months with complete execution history / audit period months | 100% | `control_executions` grouped by month | G=100%, A=partial, R=gaps |

### Control execution KPIs

| KPI | Calculation |
|---|---|
| Scheduled Controls Due | Count `control_executions` where scheduled_due_date is within selected period |
| Overdue Controls | Count `control_executions` where status = Overdue (past due date, not completed) |
| Missed Controls | Count `control_executions` where no performed_date exists past the period end |
| Manual Control Completion | Completed manual executions / scheduled manual executions |

### Evidence quality KPIs

| KPI | Calculation |
|---|---|
| Evidence Rejection Rate | Rejected documents / submitted documents in period |
| Evidence Freshness | Documents where uploaded_date > performed_date + 7 days (flagged as potentially backfilled) |
| Evidence Correction Time | Avg days between rejection and resubmission |

### Deviation KPIs

| KPI | Calculation |
|---|---|
| Exception Rate | Deviations / completed executions in period |
| Repeat Deviation Rate | Controls with >1 deviation in period / controls with any deviation |
| Mean Time to Remediate | Avg days from deviation.detected_date to remediation.closed_date |

### Access and change KPIs (CTO)

| KPI | Calculation |
|---|---|
| Approved Change Rate | change_logs with status Approved before Deployed / total changes |
| Emergency Change Rate | Emergency-type changes / total changes |
| Access Review Completion | Access reviews completed in period / scheduled access reviews |

### RAG thresholds

| KPI | Green | Amber | Red |
|---|---|---|---|
| Control Execution Rate | ≥ 95% | 85–94% | < 85% |
| Evidence Completeness Rate | ≥ 98% | 90–97% | < 90% |
| On-Time Control Rate | ≥ 95% | 85–94% | < 85% |
| Open Critical Exceptions | 0 | 1 | > 1 |
| Remediation SLA Compliance | ≥ 90% | 75–89% | < 75% |
| Access Review Completion | 100% | 95–99% | < 95% |

---

## 6. Data Model

These tables need to be added to Supabase. Existing tables remain unchanged.

### `audit_periods`
```sql
id uuid primary key,
name text,                         -- e.g. "ISAE 3402 Type 2 2026 H1"
start_date date,
end_date date,
freeze_date date,
report_due_date date,
status text,                       -- planned | active | closed | archived
auditor text,
created_at timestamptz default now()
```

### `control_objectives`
```sql
id uuid primary key,
title text,
description text,
risk_area text,                    -- access | change | operations | incident | backup
in_scope boolean default true,
created_at timestamptz default now()
```
> Also add `control_objective_id uuid references control_objectives` to existing `controls` table.

### `control_executions`
```sql
id uuid primary key,
control_id text references controls(id),
audit_period_id uuid references audit_periods(id),
scheduled_due_date date,
performed_date date,
performed_by uuid references profiles(id),
status text,                       -- scheduled | in_progress | completed | overdue | failed | not_applicable
reviewer_status text,              -- pending | approved | rejected
reviewed_by uuid references profiles(id),
reviewed_date date,
comments text,
exception_id uuid,                 -- references deviations(id), set after creation
created_at timestamptz default now()
```
> Evidence upload: add `execution_id uuid references control_executions(id)` to `document_links`.
> Add `reviewer_status text` and `reviewer_comment text` to `documents`.

### `deviations`
```sql
id uuid primary key,
control_id text references controls(id),
execution_id uuid references control_executions(id),
severity text,                     -- low | medium | high | critical
type text,                         -- missing_evidence | late_execution | failed_control | incomplete_approval
description text,
detected_date date,
detected_by uuid references profiles(id),
root_cause text,
audit_impact text,
status text,                       -- open | under_remediation | retesting | closed | risk_accepted
owner uuid references profiles(id),
created_at timestamptz default now()
```

### `remediation_actions`
```sql
id uuid primary key,
deviation_id uuid references deviations(id),
action_description text,
owner uuid references profiles(id),
due_date date,
closed_date date,
closure_evidence text,
retest_required boolean default false,
retest_result text,                -- passed | failed | not_tested
status text,                       -- open | closed | overdue
created_at timestamptz default now()
```

### `auditor_requests`
```sql
id uuid primary key,
audit_period_id uuid references audit_periods(id),
auditor text,
request_text text,
related_control text,
owner uuid references profiles(id),
due_date date,
status text,                       -- open | answered | accepted | closed
response text,
submitted_date date,
created_at timestamptz default now()
```

### `kpi_snapshots`
```sql
id uuid primary key,
audit_period_id uuid references audit_periods(id),
snapshot_date date,
kpi_name text,
value numeric,
target numeric,
rag_status text,                   -- green | amber | red
created_at timestamptz default now()
```

### `audit_log`
```sql
id uuid primary key,
actor_id uuid references profiles(id),
action text,                       -- insert | update | delete
table_name text,
record_id text,
before jsonb,
after jsonb,
created_at timestamptz default now()
```
> Populated via Supabase Postgres triggers on key tables (controls, control_executions, deviations, documents).

---

## 7. Screen Designs

### Screen 1 — Audit Period Selector (CEO header)

**Where:** Persistent dropdown in DashboardLayout header, next to current org name.

**Components:**
- Active period name + date range (e.g. "2026 H1 — 83 days remaining")
- Period status badge (Planned / Active / Closed)
- Link to Audit Period Settings page (new page, CEO-only)

**Audit Period Settings page:**
- Create/edit audit period (name, start, end, freeze date, auditor contact)
- Timeline bar: period start → freeze → report due
- Period progress %
- Button: Freeze Period (locks evidence, disables new uploads)

---

### Screen 2 — Control Execution Calendar (extends ComplianceCalendar)

**Where:** Extends existing `ComplianceCalendar` page. Add a tab "Executions".

**New tab content:**
- Auto-generated execution records per control per period (based on frequency)
- Calendar cells show: control name, due date, status chip (Scheduled / Completed / Overdue)
- Click a cell → opens ControlExecutionDialog

**ControlExecutionDialog:**
- Control name, period, scheduled_due_date
- Performed by + performed date (dropdown + date picker)
- Status selector
- Evidence upload (links to this execution_id)
- Reviewer status (Pending / Approved / Rejected) — visible to reviewers only
- Reviewer comments
- Save button

---

### Screen 3 — Evidence Review Queue (new CEO/QA page)

**Where:** New page in CEO and QA sidebar ("Evidence Review").

**Components:**
- Three tabs: Pending Review / Approved / Rejected
- Table columns: Control name, Execution date, Uploaded by, Upload date, File name, Age (days), Actions
- Action buttons: Approve / Reject (with comment modal)
- Filter: control category, owner, period
- Rejected tab shows correction requests with re-upload status

**Design note:** Mirrors existing Evidence page but filtered to reviewer workflow state.

---

### Screen 4 — Deviation Register (new CEO page)

**Where:** New page in CEO sidebar ("Deviations").

**Components:**
- Summary strip: Open / Under Remediation / Critical count
- Table: Deviation ID, Control, Severity badge, Type, Description, Owner, Due Date, Status, Actions
- Severity filter (Critical / High / Medium / Low), Status filter, Control filter
- Auto-deviations: created automatically when execution passes due date without completion
- Manual deviation button: open AddDeviationDialog
- Row expand: shows linked remediation action

**AddDeviationDialog:** control, execution, severity, type, description, root_cause, audit_impact, owner

**RemediationPanel (inline in row):** action description, owner, due date, closure evidence upload, retest result

---

### Screen 5 — Type 2 Readiness Dashboard (extends MainDashboard)

**Where:** MainDashboard gets a "Type 2 Readiness" tab alongside existing overview.

**Components:**
- Readiness Score card (large, with weighted breakdown on hover)
- Period progress timeline bar
- KPI grid (8 cards): Execution Rate, On-Time Rate, Evidence Completeness, Evidence Approval Rate, Open Exceptions, Critical Exceptions, Remediation SLA, Period Coverage
- Monthly trend line chart: execution rate over audit period months
- Exception severity bar chart
- "Action Required" banner: lists overdue controls + open critical deviations

**Drilldown:** each KPI card links to the underlying records (e.g. Evidence Completeness → Evidence Review Queue filtered to "missing").

---

### Screen 6 — Risk-Control Matrix (new CEO page)

**Where:** New CEO page or extends existing controls list with an "RCM View" toggle.

**Components:**
- Table: Control Objective | Risk | Control | Frequency | Owner | Evidence Requirement | Last Execution Status | Exceptions | Reviewer Status
- Filters: objective, risk score, owner, frequency, status
- Coverage gaps highlighted (controls with no linked objective, risks with no active controls)
- Export: CSV/PDF of full matrix

---

### Screen 7 — Auditor Request Tracker (new CEO page)

**Where:** New CEO sidebar page ("Auditor Requests").

**Components:**
- Request table: Request ID, Description, Related Control, Owner, Due Date, Status
- Status tabs: Open / Answered / Closed
- Add Request button (for compliance manager to pre-log anticipated requests)
- Row action: Respond (text + evidence link), Close
- KPI: Closure rate %, avg response time

---

### Screen 8 — Management Assertion Support (new CEO page)

**Where:** New CEO sidebar page ("Period-End Report").

**Components:**
- Period summary card: period name, dates, auditor contact
- KPI snapshot table: all 8 executive KPIs with RAG status as of period end
- Open exceptions list with severity
- Unresolved high risks list
- System description version (last updated, review status)
- Export buttons: Full Report Pack (DOCX), Evidence Index (CSV), Deviation Summary (CSV), Control Population (CSV)
- Sign-off banner: "Management has reviewed period KPIs and acknowledges [X] open exceptions" with confirmation checkbox

---

## 8. User Flows

### Flow 1 — Monthly control execution by control owner

1. Owner logs in → sees "My Executions Due" banner on dashboard
2. Opens Control Execution Calendar → finds this month's due executions
3. Clicks execution → ControlExecutionDialog opens
4. Sets performed_date, uploads evidence file
5. Saves → status changes to Completed, reviewer_status = Pending
6. Reviewer gets notification → opens Evidence Review Queue
7. Reviewer approves → execution is fully complete
8. If reviewer rejects → owner gets notification → re-uploads corrected evidence

### Flow 2 — Deviation auto-creation and remediation

1. Execution passes scheduled_due_date with no performed_date → system marks status = Overdue
2. Deviation record auto-created (type: late_execution, severity: determined by key_control flag)
3. Compliance manager sees deviation in Deviation Register
4. Assigns remediation owner + due date + action description
5. Owner closes deviation with closure evidence
6. Reviewer marks retest_result = passed → deviation status = Closed

### Flow 3 — Period-end audit preparation

1. Compliance manager navigates to Period-End Report page
2. Reviews readiness score and open exceptions
3. Exports: Control Population CSV, Evidence Index CSV, Deviation Summary CSV
4. Uploads to auditor or shares via Auditor Request Tracker
5. Confirms management assertion checkbox
6. Freezes period (disables further evidence uploads)

---

## 9. MVP Plan

Build in this exact sequence — each phase delivers usable value on its own.

### MVP 1 — Audit Period + Execution Records (weeks 1–3)

Deliverables:
- `audit_periods` table + Audit Period Settings page
- `control_executions` table with auto-generation from control frequency
- Updated ControlDetailsDialog to show execution list instead of single `last_execution`
- Period selector in dashboard header scoping all stats to active period

**Definition of done:** Every control has a list of execution stubs for the active period. Owners can mark executions complete and set performed_date.

---

### MVP 2 — Evidence per Execution + Review Workflow (weeks 4–5)

Deliverables:
- `execution_id` column on `document_links`; evidence upload dialog shows execution context
- `reviewer_status` + `reviewer_comment` on documents
- Evidence Review Queue page (Pending / Approved / Rejected tabs)
- Evidence Completeness Rate KPI on dashboard

**Definition of done:** Reviewer can approve or reject evidence attached to a specific execution. Evidence Completeness Rate is visible and accurate.

---

### MVP 3 — Deviation Register + Remediation (weeks 6–7)

Deliverables:
- `deviations` table + auto-creation trigger for overdue executions
- `remediation_actions` table
- Deviation Register page (CEO sidebar)
- AddDeviationDialog + inline RemediationPanel

**Definition of done:** Every overdue execution auto-creates a deviation. Compliance manager can assign remediation, owner can close with evidence.

---

### MVP 4 — Type 2 KPI Dashboard (week 8)

Deliverables:
- Readiness Score calculation (weighted formula)
- 8 executive KPI cards with RAG thresholds
- Monthly trend line for execution rate
- Replace existing compliance % with full readiness score

**Readiness score formula:**
```
Type 2 Readiness Score =
  (Control Execution Score × 0.25) +
  (Evidence Completeness Score × 0.25) +
  (Evidence Approval Score × 0.15) +
  (Exception Score × 0.15) +
  (Remediation Score × 0.10) +
  (Audit Request Score × 0.05) +
  (Scope Freshness Score × 0.05)
```

**Definition of done:** CEO can see the readiness score and drill into each KPI to underlying records.

---

### MVP 5 — Auditor Export Pack (week 9)

Deliverables:
- Control Population export (CSV: control ID, period, owner, execution status, evidence count)
- Evidence Index export (CSV: execution ID, control, date, file, reviewer, status)
- Deviation Summary export (CSV: deviation ID, control, severity, status, remediation)
- Extend AuditReportGenerator to include these three exports

**Definition of done:** Compliance manager can produce a complete auditor evidence pack in one click.

---

### Post-MVP backlog (in priority order)

- Control objectives library + RCM view
- Auditor Request Tracker page
- Management Assertion page with period freeze
- KPI snapshot history (monthly cron function writing to `kpi_snapshots`)
- Audit log (Postgres triggers on key tables)
- Subservice org register
- CUEC register
- Access review workflow in CTO > Access Control
- Automated integrations (Jira, Entra ID) — out of scope for prototype

---

## 10. Risks and Assumptions

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Execution stubs generated incorrectly for complex frequencies | Medium | High | Start with Monthly/Quarterly/Annual only; event-based controls remain manual |
| Evidence uploaded before execution record exists | High | Medium | Keep legacy evidence upload path; add "link to execution" step in ControlDetailsDialog |
| Readiness score gives false confidence | Low | High | Dashboard disclaimer: "This score is an internal readiness indicator. It does not replace auditor testing." |
| Audit period freeze breaks active evidence uploads | Medium | Medium | Freeze only adds a warning banner; compliance manager must explicitly confirm freeze |
| RLS complexity grows with new tables | Medium | Low | Copy existing RLS pattern (authenticated = full access) for all new tables; refine for auditor role post-MVP |
| Deviation auto-creation produces noise for event-based controls | High | Medium | Only auto-create for time-based frequencies (monthly, quarterly); event-based deviations remain manual |
| Supabase free tier storage limits hit with per-execution evidence | Low | Low | Evidence bucket already exists; no change to storage model |

**Assumptions:**

- Audit period is agreed with the external auditor before using this system for a real Type 2 engagement.
- The prototype remains a readiness and operational tracking tool. The external auditor issues the formal ISAE 3402 Type 2 report — this system does not replace that.
- Control frequency auto-generation covers Monthly, Quarterly, and Annual. Daily and Weekly controls are operationally intensive and are deferred to post-MVP.
- The "Auditor" role for read-only portal access is deferred to post-MVP; current prototype serves internal users only.
- Small service organization: fewer than 100 controls, fewer than 50 users, single active audit period at a time.

---

## 11. Open Questions for Auditor

These must be answered before going live with the Type 2 layer:

1. What is the exact audit period (start date, end date, freeze date)?
2. Which services and systems are formally in scope?
3. Which controls are designated key controls (higher deviation severity)?
4. What evidence formats are acceptable (screenshots, exports, tickets, system logs)?
5. How should event-based controls be tracked — manual logging only, or integrated ticket import?
6. What sampling approach will be used — fixed count, percentage, or risk-based?
7. What deviation threshold makes a finding material for the Type 2 report?
8. How will subservice organizations be handled — carve-out or inclusive method?
9. What retention period is required for evidence after the period closes?
10. Will the auditor access this system directly (read-only portal) or receive exported packs?
