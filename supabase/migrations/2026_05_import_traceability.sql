-- ============================================================
-- Import Governance Traceability
-- Adds source-file checksum + size to import_runs and persists row
-- transforms on import_run_rows for governance review.
--
-- Run after 2026_05_import_governance.sql. Re-runnable.
-- ============================================================

alter table public.import_runs
  add column if not exists source_checksum text;

alter table public.import_runs
  add column if not exists source_file_size bigint;

create index if not exists import_runs_source_checksum_idx
  on public.import_runs (source_checksum)
  where source_checksum is not null;

alter table public.import_run_rows
  add column if not exists transforms jsonb not null default '[]'::jsonb;
