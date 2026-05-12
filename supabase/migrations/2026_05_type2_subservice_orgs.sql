-- ============================================================
-- Type 2 Post-MVP: Subservice Organization Register
-- Run after 2026_05_type2_control_objectives_rcm.sql.
-- Re-runnable.
-- ============================================================


create table if not exists public.subservice_orgs (
  id                       uuid primary key default uuid_generate_v4(),
  name                     text not null,
  service_description      text,
  criticality              text not null default 'medium',
    -- low | medium | high | critical
  assurance_report_type    text,
    -- 'ISAE 3402 Type II' | 'SOC 2 Type II' | 'ISO 27001' | 'None' | other freeform
  last_report_date         date,
  next_review_date         date,
  status                   text not null default 'active',
    -- active | under_review | discontinued
  in_scope                 boolean not null default true,
  owner_name               text,
  review_status            text not null default 'pending',
    -- pending | accepted | accepted_with_findings | rejected
  findings_summary         text,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint subservice_orgs_criticality_check
    check (criticality in ('low', 'medium', 'high', 'critical')),
  constraint subservice_orgs_status_check
    check (status in ('active', 'under_review', 'discontinued')),
  constraint subservice_orgs_review_status_check
    check (review_status in ('pending', 'accepted', 'accepted_with_findings', 'rejected'))
);

alter table public.subservice_orgs enable row level security;
drop policy if exists "subservice_orgs_all" on public.subservice_orgs;
create policy "subservice_orgs_all" on public.subservice_orgs
  for all using (auth.role() = 'authenticated');

create index if not exists subservice_orgs_status_idx
  on public.subservice_orgs (status);

create index if not exists subservice_orgs_criticality_idx
  on public.subservice_orgs (criticality);

create index if not exists subservice_orgs_in_scope_idx
  on public.subservice_orgs (in_scope);

create index if not exists subservice_orgs_next_review_idx
  on public.subservice_orgs (next_review_date)
  where status <> 'discontinued';


-- Link table: subservice orgs ↔ control objectives (many-to-many)
create table if not exists public.subservice_org_objectives (
  subservice_org_id    uuid not null references public.subservice_orgs(id) on delete cascade,
  control_objective_id uuid not null references public.control_objectives(id) on delete cascade,
  created_at           timestamptz not null default now(),
  primary key (subservice_org_id, control_objective_id)
);

alter table public.subservice_org_objectives enable row level security;
drop policy if exists "subservice_org_objectives_all" on public.subservice_org_objectives;
create policy "subservice_org_objectives_all" on public.subservice_org_objectives
  for all using (auth.role() = 'authenticated');

create index if not exists subservice_org_objectives_objective_idx
  on public.subservice_org_objectives (control_objective_id);


-- updated_at trigger uses the shared set_updated_at function defined elsewhere
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subservice_orgs_updated_at on public.subservice_orgs;
create trigger subservice_orgs_updated_at
  before update on public.subservice_orgs
  for each row execute function public.set_updated_at();


-- Attach audit_log trigger if the audit log infrastructure is present.
do $$
begin
  if exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'record_audit_log'
  ) then
    execute 'drop trigger if exists subservice_orgs_audit_log on public.subservice_orgs';
    execute 'create trigger subservice_orgs_audit_log
               after insert or update or delete on public.subservice_orgs
               for each row execute function public.record_audit_log()';
  end if;
end$$;
