-- ============================================================
-- Type 2 Post-MVP: Auditor Request Tracker
-- Run after 2026_05_type2_mvp3.sql.
-- Re-runnable.
-- ============================================================


create table if not exists public.auditor_requests (
  id                uuid primary key default uuid_generate_v4(),
  audit_period_id   uuid not null references public.audit_periods(id) on delete cascade,
  auditor           text,
  request_text      text not null default '',
  related_control   text references public.controls(id) on delete set null,
  owner_name        text,
  due_date          date,
  status            text not null default 'open',
    -- open | answered | accepted | closed
  response          text,
  submitted_date    date not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint auditor_requests_status_check
    check (status in ('open', 'answered', 'accepted', 'closed'))
);

alter table public.auditor_requests enable row level security;
drop policy if exists "auditor_requests_all" on public.auditor_requests;
create policy "auditor_requests_all" on public.auditor_requests
  for all using (auth.role() = 'authenticated');

create index if not exists auditor_requests_period_idx
  on public.auditor_requests (audit_period_id, submitted_date desc);

create index if not exists auditor_requests_period_status_idx
  on public.auditor_requests (audit_period_id, status);

create index if not exists auditor_requests_due_idx
  on public.auditor_requests (due_date)
  where status = 'open';

create index if not exists auditor_requests_control_idx
  on public.auditor_requests (related_control);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists auditor_requests_updated_at on public.auditor_requests;
create trigger auditor_requests_updated_at
  before update on public.auditor_requests
  for each row execute function public.set_updated_at();
