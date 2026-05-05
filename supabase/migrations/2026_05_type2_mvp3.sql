-- ============================================================
-- Type 2 MVP 3: Deviation Register + Remediation Actions
-- Run after 2026_05_type2_mvp2.sql.
-- Re-runnable.
-- ============================================================


-- 1. DEVIATIONS ------------------------------------------------------
create table if not exists public.deviations (
  id               uuid primary key default uuid_generate_v4(),
  control_id       text not null references public.controls(id) on delete cascade,
  execution_id     uuid references public.control_executions(id) on delete set null,
  audit_period_id  uuid references public.audit_periods(id) on delete cascade,
  severity         text not null default 'medium',
    -- low | medium | high | critical
  type             text not null default 'late_execution',
    -- missing_evidence | late_execution | failed_control | incomplete_approval | other
  description      text not null default '',
  detected_date    date not null default current_date,
  root_cause       text,
  audit_impact     text,
  status           text not null default 'open',
    -- open | under_remediation | retesting | closed | risk_accepted
  owner_name       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.deviations enable row level security;
drop policy if exists "deviations_all" on public.deviations;
create policy "deviations_all" on public.deviations
  for all using (auth.role() = 'authenticated');

create index if not exists deviations_period_idx  on public.deviations (audit_period_id);
create index if not exists deviations_control_idx on public.deviations (control_id);
create index if not exists deviations_status_idx  on public.deviations (status);

drop trigger if exists deviations_updated_at on public.deviations;
create trigger deviations_updated_at
  before update on public.deviations
  for each row execute function public.set_updated_at();


-- 2. REMEDIATION ACTIONS ---------------------------------------------
create table if not exists public.remediation_actions (
  id                  uuid primary key default uuid_generate_v4(),
  deviation_id        uuid not null references public.deviations(id) on delete cascade,
  action_description  text not null default '',
  owner_name          text,
  due_date            date,
  closed_date         date,
  closure_evidence    text,
  retest_required     boolean not null default false,
  retest_result       text,
    -- passed | failed | not_tested
  status              text not null default 'open',
    -- open | closed | overdue
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.remediation_actions enable row level security;
drop policy if exists "remediation_actions_all" on public.remediation_actions;
create policy "remediation_actions_all" on public.remediation_actions
  for all using (auth.role() = 'authenticated');

create index if not exists remediation_deviation_idx on public.remediation_actions (deviation_id);

drop trigger if exists remediation_actions_updated_at on public.remediation_actions;
create trigger remediation_actions_updated_at
  before update on public.remediation_actions
  for each row execute function public.set_updated_at();
