# Application Progress

Top-level progress log for the SIMTEQ ISAE 3402 Compliance Dashboard prototype.

This file consolidates the scoped progress files into one application-level view. Keep the detailed files when deeper implementation notes are useful, but update this file first when work changes the product status.

## Source Documents

| File | Scope |
|---|---|
| `TYPE2_PROGRESS.md` | Type 2 readiness, audit period, execution, evidence, deviation, KPI, export, closeout, and post-MVP Type 2 work |
| `DATA_IMPORT_PROGRESS.md` | Spreadsheet/CSV import workstream |
| `APP_PAGE_ARCHITECTURE.md` | Current routed pages, sidebar groups, and role views |
| `TYPE2_EXTENSION_PLAN.md` | Original Type 2 roadmap and requirements |
| `HANDOVER.md` | Prototype handover, technical context, known limitations, and production-readiness notes |

---

## Current Product Status

**Status:** Working prototype with extended Type 2 readiness capabilities.

**Last consolidated:** 2026-05-11

The application now supports:

- Role-based views for CEO, CTO, and QA.
- Risk and control register management.
- Evidence upload, linking, review, and export.
- Audit period management and per-execution control records.
- Deviation and remediation tracking.
- Type 2 readiness dashboard and KPI calculations.
- Auditor CSV export pack.
- Control objectives and risk-control matrix.
- Auditor request tracking.
- Period-end management assertion and soft period freeze.
- Excel, CSV, and TSV data import workbench for onboarding company data.
- Guided import mapping with confidence scoring and cleanup preview.
- Import governance history for CSV/TSV imports.
- Grouped sidebar navigation architecture.
- Role-scoped route declarations for CEO, CTO, and QA views.
- Runtime role enforcement for protected routes and role view switching.
- Redistributed route/sidebar ownership so CTO and QA receive their operational pages instead of leaving every workflow under CEO.
- CEO route/sidebar surface is capped at 10 pages.
- KPI Snapshot History for Type 2 period-end evidence.
- Subservice organization register with control-objective linking.
- CUEC (Complementary User Entity Controls) register with control-objective linking.

---

## Role Views

### CEO View

Primary executive and compliance-management workspace.

Current groups:

- **Dashboard**
  - Overview
  - Type 2 Readiness
- **Controls & Risks**
  - Controls
  - Risks
- **Evidence & Audit**
  - Audit Periods
  - Evidence Review
  - Deviations
  - Auditor Requests
  - Period End
- **Governance**
  - Users

### CTO View

Technical change, release, and access-management workspace.

Current groups:

- **Dashboard**
  - Overview
- **Technical Compliance**
  - Controls
  - Evidence
  - Calendar
- **Engineering**
  - Change Log
  - Releases
  - Access

### QA View

Day-to-day compliance operation workspace.

Current groups:

- **Dashboard**
  - Overview
- **Compliance**
  - Controls
  - RCM
  - Categories
  - Calendar
  - Policies
- **Evidence & Audit**
  - Evidence
  - Audit Periods
  - Evidence Review
  - Deviations
  - Auditor Requests
  - Subservice Orgs
  - CUECs
  - Data Import
  - Report Template
  - Notifications

Detailed route inventory: `APP_PAGE_ARCHITECTURE.md`.

---

## Completed Workstreams

## Type 2 MVP 1 - Audit Period + Execution Records
**Status:** COMPLETE  
**Date:** 2026-05-05  
**Detailed log:** `TYPE2_PROGRESS.md`

Implemented:

- `audit_periods` table.
- `control_executions` table.
- `execution_id` on `document_links`.
- `AuditPeriodProvider` and `useAuditPeriod`.
- Audit Period Settings page at `/audit-period`.
- Generate executions from control frequency.
- Active-period widget in CEO sidebar.
- Execution History in `ControlDetailsDialog`.

Definition now met: every control can have execution stubs for an active period, and owners can mark executions complete.

## Type 2 MVP 2 - Evidence per Execution + Review Workflow
**Status:** COMPLETE  
**Date:** 2026-05-05  
**Detailed log:** `TYPE2_PROGRESS.md`

Implemented:

- Reviewer fields on `documents`.
- Evidence Review Queue at `/evidence-review`.
- Evidence upload tied to specific `control_executions`.
- Pending, approved, rejected evidence workflow.
- Evidence Completeness Rate KPI on Main Dashboard.

Definition now met: evidence can be approved or rejected per execution, and evidence completeness is visible.

## Type 2 MVP 3 - Deviation Register + Remediation
**Status:** COMPLETE  
**Date:** 2026-05-05  
**Detailed log:** `TYPE2_PROGRESS.md`

Implemented:

- `deviations` table.
- `remediation_actions` table.
- Deviation Register at `/deviations`.
- Manual deviation logging and editing.
- Inline remediation panel.
- Sync overdue executions into deviations.
- Open deviation KPI on Main Dashboard.

Definition now met: overdue executions can be turned into deviations, and remediation can be assigned and closed.

## Type 2 MVP 4 - Type 2 KPI Dashboard
**Status:** COMPLETE  
**Date:** 2026-05-09  
**Detailed log:** `TYPE2_PROGRESS.md`

Implemented:

- Type 2 Readiness page at `/readiness`.
- Weighted readiness score.
- 8 executive KPI cards.
- RAG thresholds.
- Monthly execution trend chart.
- Action Required banner.
- Main Dashboard link into Type 2 readiness.
- Readiness disclaimer that the system does not replace external auditor testing.

## Type 2 MVP 5 - Auditor Export Pack
**Status:** COMPLETE  
**Date:** 2026-05-09  
**Detailed log:** `TYPE2_PROGRESS.md`

Implemented:

- `src/lib/type2AuditorExports.ts`.
- Control Population CSV.
- Evidence Index CSV.
- Deviation Summary CSV.
- AuditReportGenerator integration.
- Period-scoped auditor CSV pack.

Definition now met: compliance users can produce the core Type 2 auditor evidence pack.

## Navigation Architecture Pass
**Status:** COMPLETE  
**Date:** 2026-05-09  
**Detailed logs:** `TYPE2_PROGRESS.md`, `APP_PAGE_ARCHITECTURE.md`

Implemented:

- Group registry in `allPages.tsx`.
- Grouped sidebar rendering via `SidebarNav`.
- Per-role grouped navigation.
- Per-user, per-role collapse state.
- Sidebar customization kept page-level.
- Existing routes preserved.

Current issue to watch: CEO `Evidence & Audit` and `Controls & Risks` groups are growing and may need another IA pass if more pages are added.

## Role-Scoped Route Architecture
**Status:** COMPLETE  
**Date:** 2026-05-11  
**Detailed log:** `APP_PAGE_ARCHITECTURE.md`

Changed files:

- `src/app/routes.tsx`
- `src/app/components/allPages.tsx`
- `src/app/components/ProtectedRoute.tsx`
- `src/app/components/SidebarRoleSwitcher.tsx`
- `src/app/components/ViewSwitcher.tsx`
- `src/app/pages/LoginPage.tsx`
- `src/app/utils/roleAccess.ts`
- `src/contexts/AuthContext.tsx`
- `APP_PROGRESS.md`

Implemented:

- Split route child declarations into `CEO_ROUTES`, `CTO_ROUTES`, and `QA_ROUTES`.
- Added `ROLE_ROUTE_SECTIONS` to compose each role's base path, protected layout, and visible route set.
- Moved RCM, Categories, Calendar, Data Import, Report Template, and Notifications out of CEO ownership.
- Added CTO routes/sidebar entries for Controls, Evidence, and Calendar under Technical Compliance.
- Added QA routes/sidebar entries for RCM, Categories, Audit Periods, Evidence Review, Deviations, Auditor Requests, and Data Import.
- Kept CEO on executive/audit oversight pages needed by dashboard/readiness/period-end drilldowns.
- Added shared role-access helpers for app role detection and default role landing paths.
- Enforced `requiredRole` in `ProtectedRoute`; users are redirected back to their own role landing page if they open another role's route.
- Updated login redirect logic to use the shared role landing helper instead of inline role branching.
- Filtered role/view switchers so they no longer expose CEO/CTO/QA links to every signed-in user.
- Kept auth loading active while profile data is being fetched after auth state changes, so route protection evaluates against the loaded profile role.

Route/sidebar changes:

- CEO changed from 16 role pages to 10.
- CTO changed from 4 role pages to 7.
- QA changed from 5 role pages to 14.
- New CTO routes: `/cto/controls`, `/cto/evidence`, `/cto/calendar`.
- New QA routes: `/qa/rcm`, `/qa/categories`, `/qa/audit-period`, `/qa/evidence-review`, `/qa/deviations`, `/qa/auditor-requests`, `/qa/data-import`, `/qa/report-template`, `/qa/notifications`.
- Removed CEO routes/sidebar entries: `/rcm`, `/categories`, `/calendar`, `/data-import`, `/report-template`, `/notifications`.
- Role navigation is now constrained by the current user's profile role instead of hard-coded universal view links.

Verification:

- `npm run build` passes.
- Existing Vite warnings remain: mixed dynamic/static import of `src/lib/supabase.ts` and main chunk size above 500 kB.

## Report Template and Overview Generator Linkage
**Status:** COMPLETE  
**Date:** 2026-05-11

Changed files:

- `src/app/pages/MainDashboard.tsx`
- `src/app/pages/ReportTemplateEditor.tsx`
- `src/app/components/AuditReportGenerator.tsx`
- `APP_PROGRESS.md`

Implemented:

- Overview now loads the default report template and its ordered sections as page state.
- Overview passes that exact template snapshot into the ISAE 3402 report generator dialog.
- The generator now uses report template metadata for company and reporting period, so template edits affect generated DOCX/PDF output from Overview.
- The generator pre-generation panel names the active template and visible editable section count instead of showing a static template label.
- Report Template save broadcasts a browser event and local-storage timestamp so mounted overview/generator surfaces can refresh after template changes.

Follow-up fix:

- Fixed `ProtectedRoute` to receive its `requiredRole` prop, resolving the Overview crash where role-scoped route rendering referenced an undefined variable.
- Replaced the hardcoded DOCX/PDF report bodies in `AuditReportGenerator` with a template-first renderer. Generated exports now render visible `report_template_sections` in saved order and only append live control/risk data tables from Supabase.
- Removed the SIMTEQ-specific report-body normalization shim and static generator UI claims that made the report look driven by an embedded template instead of the saved report template.

Route/sidebar changes:

- No new routes.
- No removed routes.
- No sidebar changes.
- Role navigation is now constrained by the current user's profile role instead of hard-coded universal view links.

Verification:

- `npm run build` passes.
- Existing Vite warnings remain: mixed dynamic/static import of `src/lib/supabase.ts` and main chunk size above 500 kB.

Authorization note:

- `ProtectedRoute` now enforces `requiredRole` at runtime via `canAccessRole` (`src/app/utils/roleAccess.ts`). Signed-in users opening a route owned by another role are redirected to their own role landing page.
- Database-level Row Level Security is still broad-authenticated for most tables; tightening RLS to role-aware policies is a separate hardening item.

## Control Objectives Library + RCM
**Status:** COMPLETE  
**Date:** 2026-05-10  
**Detailed log:** `TYPE2_PROGRESS.md`

Implemented:

- `control_objectives` table.
- `control_objective_id` on `controls`.
- ControlObjective type.
- RCM page at `/rcm`.
- Objective create/edit/in-scope toggle.
- Inline control-objective linking.
- Gap checks for unmapped controls, high risks without active linked controls, and in-scope objectives without controls.

## Auditor Request Tracker
**Status:** COMPLETE  
**Date:** 2026-05-10  
**Detailed log:** `TYPE2_PROGRESS.md`

Implemented:

- `auditor_requests` table.
- AuditorRequest type.
- Auditor Requests page at `/auditor-requests`.
- Active-period scoping.
- Status workflow: open, answered, accepted, closed.
- Due and overdue indicators.
- Live Audit Requests score in Type 2 Readiness.

## Management Assertion / Period End
**Status:** COMPLETE  
**Date:** 2026-05-10  
**Detailed log:** `TYPE2_PROGRESS.md`

Implemented:

- `management_assertions` table.
- `frozen_at` and `frozen_by_name` on `audit_periods`.
- Shared readiness metrics helper in `src/lib/readinessMetrics.ts`.
- Period End page at `/period-end`.
- KPI snapshot-style table.
- Open exceptions and high-risk lists.
- Auditor pack actions.
- Management assertion form.
- Soft freeze and unfreeze.

Known tradeoff: freeze is advisory. Evidence upload is not hard-blocked after freeze.

## Data Import MVP 1 - CSV/TSV Import Workbench
**Status:** COMPLETE  
**Date:** 2026-05-10  
**Detailed log:** `DATA_IMPORT_PROGRESS.md`

Implemented:

- Data Import page at `/data-import`.
- CEO Governance sidebar entry.
- CSV/TSV parser with quoted-cell support.
- Target-specific templates.
- Automatic header matching.
- Manual field mapping.
- Preview and validation before database writes.
- Imports for:
  - Control objectives
  - Risks
  - Controls
  - Risk-control links
  - Deviations
  - Auditor requests
- Active audit period defaults for period-scoped imports.
- Automatic `R###` and `C###` IDs when missing.
- UX clarity pass with a 4-step workflow:
  - Choose destination
  - Load file
  - Confirm columns
  - Import rows

CSV/TSV import remains the base path. Excel and smarter mapping were added in Import MVP 2.

## Data Import MVP 2 - Guided Excel + Smarter Mapping
**Status:** COMPLETE  
**Date:** 2026-05-10  
**Detailed log:** `DATA_IMPORT_PROGRESS.md`

Implemented:

- Native Excel workbook parsing with `xlsx` (SheetJS).
- `parseWorkbookFile(file)` wrapper for `.xlsx`, `.xls`, `.csv`, and `.tsv`.
- Worksheet picker for multi-sheet workbooks.
- CSV/TSV and Excel now feed the same downstream import flow.
- Import run `sourceType` records the source format.
- `suggestImportMapping(headers, config)` with confidence-scored mapping suggestions.
- Greedy assignment to avoid mapping one source column to multiple target fields.
- Token-overlap fallback for headers such as `Risk Owner Name` to `owner_name`.
- Expanded aliases for common GRC, ITSM, auditor, and ticketing exports:
  - risk owner
  - control owner
  - objective
  - control ref
  - audit request
  - auditor request
  - PBC item
  - finding
  - exception
  - observation
  - assigned to
  - due date
  - response due
- Async-compatible `ImportMappingSuggester` interface, ready for a future AI provider.
- Data cleanup preview with per-row transforms.
- Normalization support for:
  - risk levels
  - statuses
  - frequencies
  - deviation severity/type/status
  - auditor-request status
  - booleans
  - ISO, DD/MM/YYYY, MM/DD/YYYY, and Excel-native dates
- Data Import UI enhancements:
  - accepts `.xlsx`, `.xls`, `.csv`, `.tsv`
  - worksheet selector
  - confidence chips: Exact, Suggested, Fuzzy, Manual, Skipped
  - inline mapping reasons
  - Review suggestions action
  - transform chips showing original value to normalized value and reason
  - cleanups badge in the review header

New dependency:

- `xlsx@0.18.5`

Known gaps:

- `sampleRows` is wired through the suggester signature but not used yet.
- No real OpenAI/Anthropic integration yet.
- Transforms are not persisted to `import_run_rows`.
- Saved/named mappings per source tool are not implemented.

## Audit Log + Import Traceability Hardening
**Status:** COMPLETE  
**Date:** 2026-05-11  
**Detailed logs:** `TYPE2_PROGRESS.md`, `DATA_IMPORT_PROGRESS.md`

Implemented:

- `supabase/migrations/2026_05_audit_log.sql` adds the `audit_log` table, the generic `record_audit_log()` trigger function, and after-insert/update/delete triggers on: `controls`, `risks`, `control_executions`, `documents`, `deviations`, `remediation_actions`, `auditor_requests`, `management_assertions`, `audit_periods`, and `import_runs`.
- `audit_log` is append-only: RLS allows authenticated select and insert, but exposes no update or delete policy. Trigger function runs `security definer` and captures `auth.uid()` plus the JWT email claim where available.
- `supabase/migrations/2026_05_import_traceability.sql` adds `import_runs.source_checksum`, `import_runs.source_file_size`, and `import_run_rows.transforms` (jsonb default `[]`).
- `src/lib/dataImport.ts` computes a SHA-256 checksum and file size in the browser via `crypto.subtle` before import, passes both through `runImport`, and persists per-row `transforms` JSON alongside each `import_run_rows` insert.
- `src/lib/types.ts` adds `AuditLogEntry`, `ImportRowTransformRecord`, and extends `ImportRun` and `ImportRunRow` with the new columns.
- `src/app/pages/DataImportPage.tsx` now records checksum/size on file load, displays a truncated SHA-256 hash on each Recent imports row, and shows a richer drilldown panel with source format, size, hash, failed rows, and per-row cleanups.
- `src/app/components/AuditTrailPanel.tsx` is a reusable compact panel that lists the latest audit log entries with table filter, action badges, actor identity, and a derived change summary.
- `src/app/pages/PeriodEndPage.tsx` embeds `AuditTrailPanel` below the management assertion / freeze controls so CEO oversight reviews live audit activity inside the existing closeout page (no new route, no new sidebar entry).

Changed files:

- `supabase/migrations/2026_05_audit_log.sql` (new)
- `supabase/migrations/2026_05_import_traceability.sql` (new)
- `src/lib/types.ts`
- `src/lib/dataImport.ts`
- `src/app/pages/DataImportPage.tsx`
- `src/app/pages/PeriodEndPage.tsx`
- `src/app/components/AuditTrailPanel.tsx` (new)
- `APP_PROGRESS.md`, `TYPE2_PROGRESS.md`, `DATA_IMPORT_PROGRESS.md`

Route/sidebar changes:

- No new routes.
- No new sidebar entries. Audit trail surfaces inside `/period-end` and the import detail panel surfaces inside `/qa/data-import`.

Verification:

- `npm run build` passes.
- Existing Vite warnings remain: mixed dynamic/static import of `src/lib/supabase.ts` and main chunk size above 500 kB.

Known tradeoffs / remaining gaps:

- Source-file *contents* are not stored — only the SHA-256 hash and byte size. Retained file copies would require Supabase Storage plumbing and a retention policy.
- Import rollback for newly inserted rows is still not implemented. The audit log makes rollback safer to build later because every insert is now traceable, but no automated reversal is provided.
- Period freeze is still advisory — upload paths are not hard-blocked.
- Trigger captures `auth.uid()` and JWT email but no separate `actor_name` lookup against `profiles`. The UI displays email or falls back to the truncated UUID.
- Audit log RLS is broad-authenticated select. A future hardening pass should scope reads to roles that need them.

## Data Import MVP 3 - Import Governance Foundation
**Status:** PARTIAL  
**Date:** 2026-05-10  
**Detailed log:** `DATA_IMPORT_PROGRESS.md`

Implemented:

- `supabase/migrations/2026_05_import_governance.sql`.
- `import_runs` table.
- `import_run_rows` table.
- ImportRun and ImportRunRow types.
- Import run metadata tracking:
  - target
  - file name
  - source type
  - row counts
  - success/failure counts
  - status
  - importer name
  - started/completed timestamps
- Row-level tracking:
  - row number
  - success/failed status
  - original source row JSON
  - final payload JSON
  - error message
- Invalid preview rows are recorded as failed import rows.
- Database write failures are recorded per row.
- Data Import page shows Recent imports with expandable failed row messages.

Remaining gaps:

- Source file checksum and size — **complete** (see Audit Log + Import Traceability Hardening).
- Retained uploaded source-file copy.
- Rollback support for newly created rows.
- Audit log trigger integration — **complete**: `import_runs` is now covered by audit triggers and the audit trail panel surfaces import-run activity.
- Full transaction atomicity across imported data and history rows.

---

## In Progress / Recent Work

These items appear in the worktree or recent discussion and should be verified before handoff:

- Data Import UX clarity improvements have been implemented and build passed.
- Import governance/history foundation has been implemented and marked partial.
- Native Excel and deterministic smarter mapping are complete.
- Real AI-assisted mapping, transform persistence, and saved mappings are still planned.
- Some local files may have uncommitted user/agent changes. Check `git status --short` before editing.

---

## Planned Workstreams

## Import MVP 2 - Guided Excel + AI Mapping
**Status:** COMPLETE  
**Detailed log:** `DATA_IMPORT_PROGRESS.md`

Planned:

- Native `.xlsx` / `.xls` support - complete.
- Workbook sheet selection - complete.
- Smarter mapping suggestions - complete.
- Confidence or suggestion labels for inferred mappings - complete.
- Normalization preview for statuses, risk levels, frequencies, severities, booleans, and dates - complete.
- AI-ready mapping interface, with deterministic rule-based implementation if no backend AI integration exists - complete.
- Saved mappings per source tool.

## Import MVP 3 - Import Governance
**Status:** PARTIAL  
**Detailed log:** `DATA_IMPORT_PROGRESS.md`

Planned:

- `import_runs` table - complete.
- `import_run_rows` table - complete.
- Row-level success/failure tracking - complete for CSV/TSV imports.
- Source file checksum and optional stored copy.
- Import history in Data Import page - complete.
- Rollback support for newly created rows.
- Integration with future audit log.

## KPI Snapshot History
**Status:** COMPLETE  
**Date:** 2026-05-11  
**Detailed log:** `TYPE2_PROGRESS.md`

Changed files:

- `supabase/migrations/2026_05_type2_kpi_snapshots.sql`
- `src/lib/types.ts`
- `src/lib/kpiSnapshots.ts`
- `src/app/pages/PeriodEndPage.tsx`
- `APP_PROGRESS.md`
- `TYPE2_PROGRESS.md`

Implemented:

- `kpi_snapshots` table with period/date/name uniqueness, RAG status check, useful period/date/name indexes, and authenticated RLS.
- `KpiSnapshot` and `KpiSnapshotRagStatus` TypeScript types.
- Reusable helpers in `src/lib/kpiSnapshots.ts`:
  - build snapshot rows from `computeReadinessKpis()`
  - upsert a snapshot set for a period/date
  - load grouped snapshot history for a period
- Period End manual snapshot capture for the active period.
- Period End recent captured snapshot history showing readiness, at-risk count, watch count, row count, and capture timestamp.
- Live Period End KPI table remains intact.
- No new sidebar page.

Remaining gaps:

- No scheduled monthly cron/function yet; snapshots are manually captured from Period End.
- Snapshot rows store numeric KPI values and targets only, not supporting detail text or source-row counts.

Verification:

- `npm run build` passes.
- Existing Vite warnings remain: mixed dynamic/static import of `src/lib/supabase.ts` and main chunk size above 500 kB.

## Audit Log
**Status:** COMPLETE (foundation)  
**Source:** `TYPE2_PROGRESS.md`, `HANDOVER.md`  
**Detailed log:** Audit Log + Import Traceability Hardening above.

Implemented:

- `audit_log` table with actor, action, table, record ID, before/after JSON, source, context, timestamp.
- Postgres triggers on controls, risks, control_executions, documents, deviations, remediation_actions, auditor_requests, management_assertions, audit_periods, and import_runs.
- Append-only RLS policy set.
- `AuditTrailPanel` UI on the Period End page.

Follow-ups still open:

- Profiles join to resolve actor display name from `auth.uid()`.
- Tighter role-scoped RLS for `audit_log` selects.
- Retention/archival policy for old entries.

## Subservice Organization Register
**Status:** COMPLETE  
**Date:** 2026-05-11  
**Detailed log:** `TYPE2_PROGRESS.md`

Changed files:

- `supabase/migrations/2026_05_type2_subservice_orgs.sql` (new)
- `src/lib/types.ts`
- `src/app/pages/SubserviceOrgsPage.tsx` (new)
- `src/app/routes.tsx`
- `src/app/components/allPages.tsx`
- `APP_PROGRESS.md`, `TYPE2_PROGRESS.md`

Implemented:

- `subservice_orgs` table with name, service description, criticality (low/medium/high/critical), assurance report type, last report date, next review date, status (active/under_review/discontinued), in-scope flag, owner, review status (pending/accepted/accepted_with_findings/rejected), findings summary, and notes.
- `subservice_org_objectives` link table for many-to-many mapping to `control_objectives`.
- Authenticated RLS policies, useful indexes, and `updated_at` trigger.
- Audit log trigger attached when the `record_audit_log` function exists.
- Subservice Organizations register page with KPI strip (total, active, high/critical, review overdue, pending review, missing reports).
- Create/edit dialog covering all fields plus inline control-objective linking.
- Review-overdue highlighting on cards.
- Status, criticality, and search filters.

Route/sidebar changes:

- New QA route: `/qa/subservice-orgs`.
- New QA sidebar entry under Evidence & Audit.
- No CEO route added (CEO sidebar remains capped at 10 pages).

Verification:

- `npm run build` passes.
- Existing Vite warnings remain: mixed dynamic/static import of `src/lib/supabase.ts` and main chunk size above 500 kB.

Known tradeoffs:

- Assurance reports are stored as the most recent metadata on the org row (type, date, review status, findings). Multi-report history is not tracked; a `subservice_assurance_reports` history table can be added later.
- Subservice orgs are not yet linked to the Type 2 Readiness score or auditor export pack.

## CUEC Register
**Status:** COMPLETE  
**Date:** 2026-05-11  
**Detailed log:** `TYPE2_PROGRESS.md`

Changed files:

- `supabase/migrations/2026_05_type2_cuecs.sql` (new)
- `src/lib/types.ts`
- `src/app/pages/CuecRegisterPage.tsx` (new)
- `src/app/routes.tsx`
- `src/app/components/allPages.tsx`
- `APP_PROGRESS.md`, `TYPE2_PROGRESS.md`

Implemented:

- `cuecs` table with code (unique), title, description, category (access/data/change/operations/other), responsible_party, status (active/retired), in_scope flag, and notes.
- `cuec_control_objectives` link table for many-to-many mapping to `control_objectives`.
- Authenticated RLS policies, indexes on status/category/in_scope, and `updated_at` trigger.
- Audit log trigger attached when the `record_audit_log` function exists.
- CUEC Register page with KPI strip (Total, Active, In Scope, Linked to Objectives, Unlinked).
- Create/edit dialog with auto-suggested next code (e.g. `CUEC-03`), all fields, and inline control-objective linking via checkbox list.
- Status, category, and search filters across code/title/description/responsible party.
- Empty state copy explaining what a CUEC is.
- Delete from inside the edit dialog with confirm.

Route/sidebar changes:

- New QA route: `/qa/cuecs`.
- New QA sidebar entry under Evidence & Audit (`ListChecks` icon).
- No CEO route added (CEO sidebar remains capped at 10 pages).

Verification:

- `npm run build` passes.
- Existing Vite warnings remain: mixed dynamic/static import of `src/lib/supabase.ts` and main chunk size above 500 kB.

Known tradeoffs:

- CUECs are not yet rolled into the Type 2 Readiness score or the auditor export pack.
- No automatic linkage of CUECs into the generated ISAE 3402 report template sections; disclosure remains a manual reporting step.

## Access Review Workflow
**Status:** NOT STARTED  
**Source:** `TYPE2_PROGRESS.md`

Planned:

- Extend CTO Access Control into a formal access review workflow.
- Track review scope, reviewer, completion, exceptions, and evidence.

## Automated Integrations
**Status:** NOT STARTED  
**Source:** `TYPE2_PROGRESS.md`

Potential future integrations:

- Jira
- Entra ID
- GitHub
- ERP/GRC/source-system imports

---

## Known Limitations

From `HANDOVER.md` and current progress:

- Prototype is not production-ready.
- No test runner is configured.
- No lint command is configured.
- Many Supabase RLS policies still grant broad authenticated access.
- Email sending is mock/log based.
- User creation is partly manual through Supabase Auth.
- Some export/dashboard helpers still rely on mock data.
- Supabase calls are mostly inline in pages and dialogs.
- Error handling works but is not standardized.
- Audit logging foundation is in place via Postgres triggers on key compliance tables; production hardening (role-scoped RLS, retention, actor display name resolution) is still pending.
- Period freeze is advisory, not enforced across upload flows.
- Import rollback is not implemented yet.
- Import source-file checksum is captured; retained file *contents* are not stored.
- Real AI-assisted import mapping is not implemented yet.

---

## Build / Verification Status

Minimum verification command:

```bash
npm run build
```

Recent known result:

- Build passes.
- Existing Vite warnings remain:
  - `src/lib/supabase.ts` is both dynamically and statically imported.
  - Main bundle is larger than the default 500 kB chunk warning threshold.

There is no configured unit test, integration test, e2e test, or lint command at the time of this consolidation.

---

## Update Rules

When adding new work:

1. Add or update the relevant section in this file.
2. If the work belongs to a scoped stream, update the scoped file too:
   - Type 2 work: `TYPE2_PROGRESS.md`
   - Import work: `DATA_IMPORT_PROGRESS.md`
   - Page/navigation architecture: `APP_PAGE_ARCHITECTURE.md`
3. Include:
   - Status
   - Date
   - Changed files
   - Route/sidebar changes
   - Migrations
   - Verification run
   - Known tradeoffs or follow-ups
4. Keep completed sections concise here and put deeper implementation notes in the scoped file.
