-- ============================================================
-- Audit Log Foundation
-- Immutable audit trail for compliance-relevant tables.
--
-- Run after the other 2026_05 migrations. Re-runnable.
--
-- Design notes:
--   * One audit_log row per INSERT / UPDATE / DELETE on covered tables.
--   * Records are append-only at the policy level: authenticated users can
--     select / insert (so triggers fire on their behalf) but cannot
--     update or delete entries.
--   * Trigger captures full before/after JSON snapshots; row_to_json keeps
--     the trigger generic across tables with text or uuid primary keys.
--   * Actor identity is best-effort: auth.uid() and the JWT email claim
--     when available. Service-role / migration writes record actor as null.
-- ============================================================


-- 1. AUDIT LOG TABLE -------------------------------------------------
create table if not exists public.audit_log (
  id              uuid primary key default uuid_generate_v4(),
  actor_id        uuid,
  actor_email     text,
  actor_name      text,
  action          text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name      text not null,
  record_id       text,
  before_data     jsonb,
  after_data      jsonb,
  source          text not null default 'trigger',
  context         jsonb,
  created_at      timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_select_authenticated" on public.audit_log;
create policy "audit_log_select_authenticated" on public.audit_log
  for select using (auth.role() = 'authenticated');

drop policy if exists "audit_log_insert_authenticated" on public.audit_log;
create policy "audit_log_insert_authenticated" on public.audit_log
  for insert with check (auth.role() = 'authenticated');

-- No update or delete policy is created on purpose: the table is append-only
-- for application users. Service-role tooling can still rewrite if needed.

create index if not exists audit_log_table_record_idx
  on public.audit_log (table_name, record_id);

create index if not exists audit_log_created_at_idx
  on public.audit_log (created_at desc);

create index if not exists audit_log_actor_idx
  on public.audit_log (actor_id);


-- 2. GENERIC TRIGGER FUNCTION ---------------------------------------
create or replace function public.record_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_uid      uuid;
  actor_email    text;
  before_json    jsonb;
  after_json     jsonb;
  record_key     text;
begin
  begin
    actor_uid := auth.uid();
  exception when others then
    actor_uid := null;
  end;

  begin
    actor_email := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';
  exception when others then
    actor_email := null;
  end;

  if (tg_op = 'INSERT') then
    before_json := null;
    after_json  := to_jsonb(new);
    record_key  := coalesce(after_json ->> 'id', '');
  elsif (tg_op = 'UPDATE') then
    before_json := to_jsonb(old);
    after_json  := to_jsonb(new);
    if before_json = after_json then
      return new; -- no-op update
    end if;
    record_key := coalesce(after_json ->> 'id', before_json ->> 'id', '');
  elsif (tg_op = 'DELETE') then
    before_json := to_jsonb(old);
    after_json  := null;
    record_key  := coalesce(before_json ->> 'id', '');
  else
    return null;
  end if;

  insert into public.audit_log (
    actor_id, actor_email, action, table_name, record_id,
    before_data, after_data, source
  ) values (
    actor_uid, actor_email, tg_op, tg_table_name, record_key,
    before_json, after_json, 'trigger'
  );

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;


-- 3. ATTACH TRIGGERS TO COVERED TABLES ------------------------------
-- Each block is idempotent: drop-if-exists followed by create.
do $$
declare
  tbl text;
  covered_tables text[] := array[
    'controls',
    'risks',
    'control_executions',
    'documents',
    'deviations',
    'remediation_actions',
    'auditor_requests',
    'management_assertions',
    'audit_periods',
    'import_runs'
  ];
begin
  foreach tbl in array covered_tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = tbl
    ) then
      execute format(
        'drop trigger if exists %I on public.%I',
        tbl || '_audit_log', tbl
      );
      execute format(
        'create trigger %I after insert or update or delete on public.%I
           for each row execute function public.record_audit_log()',
        tbl || '_audit_log', tbl
      );
    end if;
  end loop;
end$$;
