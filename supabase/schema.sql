-- ============================================================
-- ISAE 3402 Compliance Dashboard – Full Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PROFILES  (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        text not null check (role in ('ceo','cto','qa')),
  department  text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'qa')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. RISKS
-- ============================================================
create table if not exists public.risks (
  id              text primary key,           -- e.g. R001
  title           text not null,
  category        text not null,
  likelihood      text not null check (likelihood in ('Low','Medium','High')),
  impact          text not null check (impact  in ('Low','Medium','High')),
  risk_score      integer not null,
  status          text not null check (status  in ('Active','Mitigated','Closed')),
  owner_name      text not null,
  description     text,
  last_review     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 3. CONTROLS
-- ============================================================
create table if not exists public.controls (
  id              text primary key,           -- e.g. C001
  title           text not null,
  category        text not null,
  frequency       text not null check (frequency in ('Monthly','Quarterly','Yearly')),
  status          text not null check (status   in ('Completed','Pending','Overdue')),
  owner_name      text not null,
  description     text,
  last_execution  date,
  next_due        date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- 4. RISK_CONTROLS  (many-to-many)
-- ============================================================
create table if not exists public.risk_controls (
  id          uuid primary key default uuid_generate_v4(),
  risk_id     text not null references public.risks(id)    on delete cascade,
  control_id  text not null references public.controls(id) on delete cascade,
  unique (risk_id, control_id)
);

-- ============================================================
-- 5. DOCUMENTS
-- ============================================================
create table if not exists public.documents (
  id               uuid primary key default uuid_generate_v4(),
  name             text not null,
  file_type        text,
  file_size        bigint,
  file_path        text,
  uploaded_by_name text,
  current_version  integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- 6. DOCUMENT_VERSIONS
-- ============================================================
create table if not exists public.document_versions (
  id               uuid primary key default uuid_generate_v4(),
  document_id      uuid not null references public.documents(id) on delete cascade,
  version          integer not null,
  file_path        text,
  file_size        bigint,
  changelog        text,
  uploaded_by_name text,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- 7. DOCUMENT_LINKS  (attach a document to any entity)
-- ============================================================
create table if not exists public.document_links (
  id          uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  link_type   text not null,   -- 'control' | 'risk' | 'policy' | 'release'
  link_id     text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 8. COMPLIANCE_EVENTS
-- ============================================================
create table if not exists public.compliance_events (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  date        date not null,
  type        text not null,   -- 'audit' | 'deadline' | 'review' | 'training'
  status      text not null check (status in ('Upcoming','Completed','Overdue')),
  description text,
  control_id  text references public.controls(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 9. ALERTS
-- ============================================================
create table if not exists public.alerts (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  message     text,
  type        text not null check (type in ('warning','error','info','success')),
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 10. REMINDERS
-- ============================================================
create table if not exists public.reminders (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  email         text not null,
  days_before   integer not null default 7,
  email_enabled boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 11. CHANGE_LOGS
-- ============================================================
create table if not exists public.change_logs (
  id           uuid primary key default uuid_generate_v4(),
  change_id    text not null,               -- e.g. CHG-001
  title        text not null,
  description  text,
  author_name  text not null,
  status       text not null check (status in ('Draft','In Review','Approved','Rejected','Deployed')),
  category     text,
  impact       text check (impact in ('Low','Medium','High','Critical')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- 12. RELEASES
-- ============================================================
-- ============================================================
-- 12b. PRODUCTS (product registry for release tracking)
-- ============================================================
create table if not exists public.products (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  owner_name   text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.releases (
  id                uuid primary key default uuid_generate_v4(),
  version           text not null,               -- e.g. v2.4.1
  title             text not null,
  description       text,
  status            text not null check (status in ('Planned','In Progress','Released','Rolled Back')),
  environment       text default 'Production',
  product_name      text,
  release_date      date,
  released_by_name  text,
  approved_by_name  text,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- 12c. RELEASE CHANGES (changelog items per release)
-- ============================================================
create table if not exists public.release_changes (
  id           uuid primary key default uuid_generate_v4(),
  release_id   uuid not null references public.releases(id) on delete cascade,
  change_type  text not null check (change_type in ('Feature','Bug Fix','Security','Breaking Change','Performance','Other')),
  description  text not null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 13. POLICIES
-- ============================================================
create table if not exists public.policies (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  category     text not null,
  version      text not null default '1.0',
  status       text not null check (status in ('Active','Draft','Under Review','Archived')),
  owner_name   text not null,
  review_date  date,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles          enable row level security;
alter table public.risks             enable row level security;
alter table public.controls          enable row level security;
alter table public.risk_controls     enable row level security;
alter table public.documents         enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_links    enable row level security;
alter table public.compliance_events enable row level security;
alter table public.alerts            enable row level security;
alter table public.reminders         enable row level security;
alter table public.change_logs       enable row level security;
alter table public.releases          enable row level security;
alter table public.policies          enable row level security;

-- Profiles: users can read all, update own
create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Risks, Controls: authenticated read/write
create policy "risks_all"    on public.risks    for all using (auth.role() = 'authenticated');
create policy "controls_all" on public.controls for all using (auth.role() = 'authenticated');

-- Risk Controls
create policy "risk_controls_all" on public.risk_controls for all using (auth.role() = 'authenticated');

-- Documents & versions & links
create policy "documents_all"         on public.documents         for all using (auth.role() = 'authenticated');
create policy "doc_versions_all"      on public.document_versions for all using (auth.role() = 'authenticated');
create policy "doc_links_all"         on public.document_links    for all using (auth.role() = 'authenticated');

-- Compliance events, alerts
create policy "compliance_events_all" on public.compliance_events for all using (auth.role() = 'authenticated');
create policy "alerts_all"            on public.alerts            for all using (auth.role() = 'authenticated');

-- Reminders: users see only their own
create policy "reminders_select" on public.reminders for select using (auth.uid() = user_id);
create policy "reminders_insert" on public.reminders for insert with check (auth.uid() = user_id);
create policy "reminders_update" on public.reminders for update using (auth.uid() = user_id);
create policy "reminders_delete" on public.reminders for delete using (auth.uid() = user_id);

-- Change logs, releases, policies
create policy "change_logs_all" on public.change_logs for all using (auth.role() = 'authenticated');
create policy "releases_all"    on public.releases    for all using (auth.role() = 'authenticated');
create policy "policies_all"    on public.policies    for all using (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Run separately if bucket doesn't exist:
-- insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false);

create policy "evidence_select" on storage.objects for select using (
  auth.role() = 'authenticated' and bucket_id = 'evidence'
);
create policy "evidence_insert" on storage.objects for insert with check (
  auth.role() = 'authenticated' and bucket_id = 'evidence'
);
create policy "evidence_update" on storage.objects for update using (
  auth.role() = 'authenticated' and bucket_id = 'evidence'
);
create policy "evidence_delete" on storage.objects for delete using (
  auth.role() = 'authenticated' and bucket_id = 'evidence'
);
