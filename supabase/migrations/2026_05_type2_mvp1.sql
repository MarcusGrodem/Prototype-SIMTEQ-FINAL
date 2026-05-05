-- ============================================================
-- Type 2 MVP 1: Audit Periods + Control Executions
-- Run after schema.sql and previous migrations.
-- Re-runnable (uses IF NOT EXISTS / ALTER ... ADD COLUMN IF NOT EXISTS).
-- ============================================================


-- 1. AUDIT PERIODS ---------------------------------------------------
create table if not exists public.audit_periods (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  start_date       date not null,
  end_date         date not null,
  freeze_date      date,
  report_due_date  date,
  status           text not null default 'planned',  -- planned | active | closed | archived
  auditor          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.audit_periods enable row level security;
drop policy if exists "audit_periods_all" on public.audit_periods;
create policy "audit_periods_all" on public.audit_periods
  for all using (auth.role() = 'authenticated');

-- Only one period can be active at a time (enforced in app layer).


-- 2. CONTROL EXECUTIONS ----------------------------------------------
create table if not exists public.control_executions (
  id                  uuid primary key default uuid_generate_v4(),
  control_id          text not null references public.controls(id) on delete cascade,
  audit_period_id     uuid not null references public.audit_periods(id) on delete cascade,
  scheduled_due_date  date not null,
  performed_date      date,
  performed_by_name   text,
  status              text not null default 'scheduled',
    -- scheduled | in_progress | completed | overdue | failed | not_applicable
  reviewer_status     text not null default 'pending',
    -- pending | approved | rejected
  reviewed_by_name    text,
  reviewed_date       date,
  comments            text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.control_executions enable row level security;
drop policy if exists "control_executions_all" on public.control_executions;
create policy "control_executions_all" on public.control_executions
  for all using (auth.role() = 'authenticated');

-- Index for common query: all executions for a period
create index if not exists control_executions_period_idx
  on public.control_executions (audit_period_id, scheduled_due_date);

-- Index for per-control lookup
create index if not exists control_executions_control_idx
  on public.control_executions (control_id);


-- 3. LINK EVIDENCE TO A SPECIFIC EXECUTION ---------------------------
-- Adds optional execution_id to document_links so evidence can be
-- scoped to a control_execution rather than just a control.
alter table public.document_links
  add column if not exists execution_id uuid references public.control_executions(id) on delete set null;


-- 4. UPDATED_AT TRIGGER for audit_periods ----------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists audit_periods_updated_at on public.audit_periods;
create trigger audit_periods_updated_at
  before update on public.audit_periods
  for each row execute function public.set_updated_at();

drop trigger if exists control_executions_updated_at on public.control_executions;
create trigger control_executions_updated_at
  before update on public.control_executions
  for each row execute function public.set_updated_at();
