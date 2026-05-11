-- ============================================================
-- Import MVP 3: Import Governance Foundation
-- Run after 2026_05_type2_auditor_requests.sql.
-- Re-runnable.
-- ============================================================


create table if not exists public.import_runs (
  id                uuid primary key default uuid_generate_v4(),
  target            text not null,
  file_name         text,
  source_type       text not null default 'csv_tsv',
  row_count         integer not null default 0 check (row_count >= 0),
  success_count     integer not null default 0 check (success_count >= 0),
  failure_count     integer not null default 0 check (failure_count >= 0),
  status            text not null default 'running'
    check (status in ('running', 'completed', 'completed_with_errors', 'failed')),
  imported_by_name  text,
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.import_runs enable row level security;
drop policy if exists "import_runs_all" on public.import_runs;
create policy "import_runs_all" on public.import_runs
  for all using (auth.role() = 'authenticated');

create index if not exists import_runs_target_idx
  on public.import_runs (target);

create index if not exists import_runs_created_at_idx
  on public.import_runs (created_at desc);


create table if not exists public.import_run_rows (
  id              uuid primary key default uuid_generate_v4(),
  import_run_id   uuid not null references public.import_runs(id) on delete cascade,
  row_number      integer not null,
  status          text not null check (status in ('success', 'failed')),
  source_data     jsonb not null default '{}'::jsonb,
  payload         jsonb not null default '{}'::jsonb,
  error_message   text,
  created_at      timestamptz not null default now()
);

alter table public.import_run_rows enable row level security;
drop policy if exists "import_run_rows_all" on public.import_run_rows;
create policy "import_run_rows_all" on public.import_run_rows
  for all using (auth.role() = 'authenticated');

create index if not exists import_run_rows_run_idx
  on public.import_run_rows (import_run_id);

create index if not exists import_run_rows_run_status_idx
  on public.import_run_rows (import_run_id, status);
