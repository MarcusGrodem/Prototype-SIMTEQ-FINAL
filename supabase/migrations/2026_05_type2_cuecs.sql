-- ============================================================
-- Type 2 Post-MVP: CUEC (Complementary User Entity Controls) Register
-- Run after 2026_05_type2_control_objectives_rcm.sql.
-- Re-runnable.
-- ============================================================


create table if not exists public.cuecs (
  id                       uuid primary key default uuid_generate_v4(),
  code                     text not null,
    -- short reference like "CUEC-01"
  title                    text not null,
  description              text,
  category                 text not null default 'other',
    -- access | data | change | operations | other
  responsible_party        text,
    -- the user entity role expected to operate this control
  status                   text not null default 'active',
    -- active | retired
  in_scope                 boolean not null default true,
  notes                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint cuecs_category_check
    check (category in ('access', 'data', 'change', 'operations', 'other')),
  constraint cuecs_status_check
    check (status in ('active', 'retired')),
  constraint cuecs_code_unique unique (code)
);

alter table public.cuecs enable row level security;
drop policy if exists "cuecs_all" on public.cuecs;
create policy "cuecs_all" on public.cuecs
  for all using (auth.role() = 'authenticated');

create index if not exists cuecs_status_idx
  on public.cuecs (status);

create index if not exists cuecs_category_idx
  on public.cuecs (category);

create index if not exists cuecs_in_scope_idx
  on public.cuecs (in_scope);


-- Link table: cuecs ↔ control objectives (many-to-many)
create table if not exists public.cuec_control_objectives (
  cuec_id              uuid not null references public.cuecs(id) on delete cascade,
  control_objective_id uuid not null references public.control_objectives(id) on delete cascade,
  created_at           timestamptz not null default now(),
  primary key (cuec_id, control_objective_id)
);

alter table public.cuec_control_objectives enable row level security;
drop policy if exists "cuec_control_objectives_all" on public.cuec_control_objectives;
create policy "cuec_control_objectives_all" on public.cuec_control_objectives
  for all using (auth.role() = 'authenticated');

create index if not exists cuec_control_objectives_objective_idx
  on public.cuec_control_objectives (control_objective_id);


-- updated_at trigger uses the shared set_updated_at function defined elsewhere
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cuecs_updated_at on public.cuecs;
create trigger cuecs_updated_at
  before update on public.cuecs
  for each row execute function public.set_updated_at();


-- Attach audit_log trigger if the audit log infrastructure is present.
do $$
begin
  if exists (
    select 1 from information_schema.routines
    where routine_schema = 'public' and routine_name = 'record_audit_log'
  ) then
    execute 'drop trigger if exists cuecs_audit_log on public.cuecs';
    execute 'create trigger cuecs_audit_log
               after insert or update or delete on public.cuecs
               for each row execute function public.record_audit_log()';
  end if;
end$$;
