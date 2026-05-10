# Data Import Progress

Tracks the workstream for letting companies bring their own compliance data into the prototype from existing tools such as Excel exports, CSV files, and operational registers.

Reference context: `TYPE2_PROGRESS.md`

---

## Import MVP 1 - CSV/TSV Import Workbench
**Status: COMPLETE**
**Date: 2026-05-10**

### Goal
- Give companies a practical way to import their own objectives, risks, controls, deviations, auditor requests, and relationship mappings without hand-entering every row.
- Start with CSV/TSV because it works directly with Excel, Google Sheets, ERP exports, GRC tools, and ticketing-system reports.

### Planned deliverables
- Data Import page in the CEO/Governance area - complete.
- CSV/TSV parser with quoted-cell support - complete.
- Target-specific import templates and expected columns - complete.
- Automatic header matching for common aliases such as `owner`, `owner_name`, `risk owner`, `control owner` - complete.
- Preview and validation before database writes - complete.
- Import adapters - complete:
  - Control objectives
  - Risks
  - Controls
  - Risk-control links
  - Deviations
  - Auditor requests
- Active audit period defaults for period-scoped imports - complete.
- Missing `R###` and `C###` IDs are generated during import for risk and control rows - complete.

### Implementation
- `src/lib/dataImport.ts`
  - Import target registry and field definitions.
  - CSV/TSV parsing.
  - Automatic header mapping.
  - Payload normalization and validation.
  - Template CSV generation.
  - Supabase import execution.
- `src/app/pages/DataImportPage.tsx`
  - Target selector.
  - File upload.
  - Mapping controls.
  - Preview table with row-level errors and warnings.
  - Valid-row import action.
- `src/app/components/allPages.tsx`
  - Added `Data Import` to CEO Governance group.
- `src/app/routes.tsx`
  - Added `/data-import`.

### Out of scope for MVP 1
- Native `.xlsx` parsing inside the browser.
- AI-assisted mapping.
- Import history/audit log.
- File storage of the source spreadsheet.
- Deduplication beyond explicit IDs or natural keys handled by Supabase upserts.

---

## Import MVP 2 - Guided Excel + AI Mapping
**Status: NOT STARTED**

Planned:
- Native `.xlsx` support via a spreadsheet parser dependency.
- Optional AI-assisted column mapping and data cleaning.
- Suggested transforms for inconsistent statuses, risk levels, owner names, and dates.
- Explainable mapping decisions before import.
- Reusable saved mappings per source tool.

---

## Import MVP 3 - Import Governance
**Status: NOT STARTED**

Planned:
- `import_runs` and `import_run_rows` tables.
- Row-level success/failure tracking.
- Source file checksum and uploaded copy.
- Rollback support for newly created rows.
- Import history visible from the Data Import page.
- Integration with future audit log triggers.
