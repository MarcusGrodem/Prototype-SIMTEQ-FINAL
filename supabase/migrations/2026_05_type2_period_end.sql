-- ============================================================
-- Type 2 Post-MVP: Management Assertion + Period Freeze
-- Run after 2026_05_type2_mvp3.sql.
-- Re-runnable.
-- ============================================================


-- 1. AUDIT_PERIODS — add explicit frozen_at marker -------------------
-- `status='closed'` means "period has ended". Freezing is an explicit
-- management action that can happen before the period is fully closed
-- (e.g. evidence cut-off for the auditor). Stored separately so closing
-- and freezing remain independent.
alter table public.audit_periods
  add column if not exists frozen_at      timestamptz;

alter table public.audit_periods
  add column if not exists frozen_by_name text;


-- 2. MANAGEMENT_ASSERTIONS -------------------------------------------
create table if not exists public.management_assertions (
  id                uuid primary key default uuid_generate_v4(),
  audit_period_id   uuid not null references public.audit_periods(id) on delete cascade,
  signer_name       text not null,
  signed_date       date not null default current_date,
  acknowledgement   boolean not null default false,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.management_assertions enable row level security;
drop policy if exists "management_assertions_all" on public.management_assertions;
create policy "management_assertions_all" on public.management_assertions
  for all using (auth.role() = 'authenticated');

create index if not exists management_assertions_period_idx
  on public.management_assertions (audit_period_id);

drop trigger if exists management_assertions_updated_at on public.management_assertions;
create trigger management_assertions_updated_at
  before update on public.management_assertions
  for each row execute function public.set_updated_at();
