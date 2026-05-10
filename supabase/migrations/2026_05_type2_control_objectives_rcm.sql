-- ============================================================
-- Type 2 Post-MVP: Control Objectives Library + RCM
-- Run after 2026_05_type2_mvp3.sql.
-- Re-runnable.
-- ============================================================


create table if not exists public.control_objectives (
  id                    uuid primary key default uuid_generate_v4(),
  title                 text not null,
  description           text,
  risk_area             text,
  evidence_requirement  text,
  in_scope              boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.controls
  add column if not exists control_objective_id uuid references public.control_objectives(id) on delete set null;

alter table public.control_objectives enable row level security;
drop policy if exists "control_objectives_all" on public.control_objectives;
create policy "control_objectives_all" on public.control_objectives
  for all using (auth.role() = 'authenticated');

create index if not exists control_objectives_in_scope_idx
  on public.control_objectives (in_scope);

create index if not exists control_objectives_risk_area_idx
  on public.control_objectives (risk_area);

create index if not exists controls_control_objective_idx
  on public.controls (control_objective_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists control_objectives_updated_at on public.control_objectives;
create trigger control_objectives_updated_at
  before update on public.control_objectives
  for each row execute function public.set_updated_at();
