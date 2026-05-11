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

### UX/UI clarity pass
- Reworked the page around a four-step workflow:
  - Choose destination
  - Load file
  - Confirm columns
  - Import rows
- Added a persistent workflow status bar showing current step and completion state.
- Replaced the generic file input with an explicit "Select CSV or TSV" action and file-loaded state.
- Added visible import blockers explaining exactly what is missing before import can run.
- Added summary metrics for rows found, mapped fields, and required-field coverage.
- Rewrote copy to explain Excel CSV export, required fields, period-scoped imports, and row preview behavior more directly.

### Out of scope for MVP 1
- Native `.xlsx` parsing inside the browser.
- AI-assisted mapping.
- Import history/audit log.
- File storage of the source spreadsheet.
- Deduplication beyond explicit IDs or natural keys handled by Supabase upserts.

---

## Import MVP 2 - Guided Excel + Smarter Mapping
**Status: COMPLETE**
**Date: 2026-05-10**

### Goal
- Accept Excel workbooks directly so companies don't need to "Save as CSV" first.
- Make column mapping more forgiving for common GRC, ITSM, and ticketing-tool exports.
- Show the user exactly what is being normalised before any rows are written.

### Native Excel support
- Added the `xlsx` (SheetJS) dependency and a unified `parseWorkbookFile(file)` API in `src/lib/dataImport.ts`.
  - Reads `.xlsx` and `.xls` workbooks via `ArrayBuffer` and converts each sheet to the existing `ParsedSheet` shape.
  - Returns `{ sheetNames, format, parseSheet }` so a workbook with multiple tabs can expose a worksheet picker.
  - CSV/TSV files reuse the existing `parseDelimitedText` parser through the same wrapper, so the rest of the page is format-agnostic.
- `DataImportPage` accepts `.xlsx`, `.xls`, `.csv`, `.tsv` in the file input.
  - When more than one worksheet is present, a "Worksheet" select appears in the load card and re-parses on change.
  - Header dedupe (`column_2`, `Owner (2)`) prevents collisions when Excel files have blank or repeated header cells.
- `runImport` now records the source format (`xlsx` / `csv` / `tsv`) on the import run via `RunImportOptions.sourceType`.

### Smarter mapping assistant
- New `suggestImportMapping(headers, config)` returns `{ mapping, suggestions }` where each suggestion carries `confidence` (`exact | alias | fuzzy | manual | none`), a numeric score, and a human reason.
  - Greedy assignment picks the highest-scoring `(field, header)` pair, ensuring the same header is never auto-mapped to two fields.
  - Token-overlap fallback handles inputs like "Risk Owner Name" → `owner_name` even when no exact alias exists.
- Field aliases broadened to cover common source labels: `risk owner`, `control owner`, `objective`, `control ref`, `audit request`, `auditor request`, `pbc item`, `finding`, `exception`, `observation`, `assigned to`, `due date`, `response due`, `request date`, etc.
- `buildAutoMapping` is kept as a thin wrapper for backwards compatibility.
- The suggester signature is intentionally swappable: `ImportMappingSuggester = (headers, config, sampleRows?) => MappingSuggestionResult | Promise<MappingSuggestionResult>` so an AI provider can be plugged in later without touching call-sites.

### Data cleanup preview
- `ImportPreviewRow` now carries `transforms: { field, original, normalized, reason }[]`.
- `normalizePayload` records every meaningful normalization:
  - Likelihood / impact (`Med` → `Medium`), control status (`done` → `Completed`), frequency (`Quarterly review` → `Quarterly`).
  - Deviation severity (`major` → `high`), type (`overdue` → `late_execution`), status (`risk accepted` → `risk_accepted`).
  - Auditor request status (`responded` → `answered`).
  - Boolean parsing for `in_scope` (`yes`, `y`, `1`, `in scope` → `true`).
  - Date reformatting (DD/MM/YYYY, MM/DD/YYYY, ISO timestamps → `YYYY-MM-DD`).
  - Defaults applied when fields are blank (today's date, computed `risk_score`, active audit period filled in).
- The preview header surfaces a `cleanups` badge with the total transform count.
- Each row in the preview table shows compact transform chips: `field — old → new — reason`.

### UI
- Step 2 "Load file" card now lists Excel and CSV/TSV both as first-class formats and shows the parsed format on the loaded file chip.
- Step 3 "Confirm columns" card now shows:
  - Confidence chip per field (`Exact`, `Suggested`, `Fuzzy`, `Manual`, `Skipped`).
  - "Review suggestions" button that re-runs the suggester (clears manual overrides).
  - Inline reason caption underneath each auto-mapped field.
  - Header summary with counts of exact/alias/fuzzy auto-matches.
- Manual selections are tracked separately so the confidence chip flips to "Manual" instead of incorrectly claiming an automatic match.
- The 4-step structure, sidebar grouping (`grp_ceo_governance`), and existing import-history surface from MVP 3 are preserved.

### Verification
- `npm run build` passes (new dep: `xlsx`).

### Known gaps / next pass
- The suggester's `sampleRows` parameter is wired through but unused; an AI suggester could feed cell samples into a model for richer guesses.
- Transforms are computed per row but not yet exported to `import_run_rows`; useful for governance review.
- Saved/named mappings per source tool remain on the backlog.
- A dedicated AI suggester (OpenAI / Anthropic) would replace `suggestImportMapping` without page-level changes; secrets are intentionally not added until that integration is scoped.

---

## Import MVP 3 - Import Governance
**Status: PARTIAL**
**Date: 2026-05-10**

Planned:
- `import_runs` and `import_run_rows` tables - complete.
- Row-level success/failure tracking - complete for CSV/TSV imports.
- Source file checksum and uploaded copy.
- Rollback support for newly created rows.
- Import history visible from the Data Import page - complete.
- Integration with future audit log triggers.

### Implementation
- `supabase/migrations/2026_05_import_governance.sql`
  - Created `import_runs` and `import_run_rows`.
  - Added authenticated RLS policies and indexes for target, created timestamp, and run row lookup.
- `src/lib/types.ts`
  - Added `ImportRun` and `ImportRunRow`.
- `src/lib/dataImport.ts`
  - `runImport` now creates an import run, records source file/importer metadata, imports valid rows, and stores row-level success/failure records including invalid preview rows.
  - Added helpers to fetch recent import runs and failed row details.
- `src/app/pages/DataImportPage.tsx`
  - Added a compact Recent imports section with expandable failed row messages.

### Remaining governance gaps
- Source file checksum — **complete** in the traceability pass below.
- Retained uploaded source-file copy.
- Rollback support for newly created rows.
- Dedicated audit log trigger integration — **complete** (see Audit Log + Import Traceability section in `APP_PROGRESS.md`).

---

## Import Governance Traceability
**Status: COMPLETE**
**Date: 2026-05-11**

### Goal
- Make every import run forensically reproducible: prove which file was imported, what was changed by normalization, and tie import activity into the new audit log.

### Migration
- `supabase/migrations/2026_05_import_traceability.sql`
  - `import_runs.source_checksum text` — SHA-256 of the uploaded file.
  - `import_runs.source_file_size bigint` — uploaded file size in bytes.
  - `import_run_rows.transforms jsonb default '[]'::jsonb` — persisted normalization details per row.
  - Indexed `import_runs.source_checksum` (partial index where the value is set).

### Types (`src/lib/types.ts`)
- Added `source_checksum` and `source_file_size` to `ImportRun`.
- Added `transforms: ImportRowTransformRecord[]` to `ImportRunRow`.
- Added `ImportRowTransformRecord` shape: `{ field, original, normalized, reason }`.

### Library (`src/lib/dataImport.ts`)
- New `computeFileChecksum(file)` helper uses `crypto.subtle.digest('SHA-256', ...)` in the browser and returns `{ checksum, size }`.
- `RunImportOptions` now accepts `sourceChecksum` and `sourceFileSize`.
- `runImport` writes both to the new `import_runs` columns and persists per-row `transforms` JSON alongside each `import_run_rows` insert.

### UI (`src/app/pages/DataImportPage.tsx`)
- File-load step computes and stores SHA-256 + size after parsing the workbook.
- Recent imports table now shows a truncated hash under the file name.
- Row expansion was replaced with a richer detail panel (`RunDetailPanel`):
  - Source format, source size, full SHA-256, started timestamp.
  - Failed row list with error messages (existing behavior preserved).
  - First 5 rows with cleanup transforms, rendered as compact chips.

### Audit log integration
- The new `audit_log` trigger (see TYPE2_PROGRESS) covers `import_runs`, so every import-run row insert and update produces an audit entry visible in the Audit Trail panel on the Period End page.

### Remaining gaps
- Retained source-file *contents* (Supabase Storage upload + retention policy) is still open.
- Rollback for newly created rows is still open. The audit log makes this safer to implement later because every insert is now traceable.
- Saved/named mappings per source tool remain on the backlog.
