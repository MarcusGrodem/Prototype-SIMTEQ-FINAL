-- ============================================================
-- Type 2 Post-MVP: KPI Snapshot History
-- Run after 2026_05_type2_period_end.sql.
-- Re-runnable.
-- ============================================================

create table if not exists public.kpi_snapshots (
  id                uuid primary key default uuid_generate_v4(),
  audit_period_id   uuid not null references public.audit_periods(id) on delete cascade,
  snapshot_date     date not null default current_date,
  kpi_name          text not null,
  value             numeric,
  target            numeric,
  rag_status        text not null default 'neutral',
  created_at        timestamptz not null default now(),
  constraint kpi_snapshots_rag_status_check
    check (rag_status in ('green', 'amber', 'red', 'neutral')),
  constraint kpi_snapshots_period_date_name_unique
    unique (audit_period_id, snapshot_date, kpi_name)
);

alter table public.kpi_snapshots enable row level security;
drop policy if exists "kpi_snapshots_all" on public.kpi_snapshots;
create policy "kpi_snapshots_all" on public.kpi_snapshots
  for all using (auth.role() = 'authenticated');

create index if not exists kpi_snapshots_period_date_idx
  on public.kpi_snapshots (audit_period_id, snapshot_date desc);

create index if not exists kpi_snapshots_period_name_date_idx
  on public.kpi_snapshots (audit_period_id, kpi_name, snapshot_date desc);

create index if not exists kpi_snapshots_created_at_idx
  on public.kpi_snapshots (created_at desc);
