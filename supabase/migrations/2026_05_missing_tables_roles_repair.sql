-- ============================================================
-- Existing database repair
-- Run in Supabase SQL Editor when the app reports missing:
-- risk_categories, report_templates, notification_log, or roles.
-- Re-runnable and non-destructive.
-- ============================================================

create extension if not exists "uuid-ossp";

-- Allow custom profile roles instead of only ceo/cto/qa.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles alter column role set default 'qa';

create table if not exists public.roles (
  key         text primary key,
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);

alter table public.roles enable row level security;
drop policy if exists "roles_all" on public.roles;
create policy "roles_all" on public.roles
  for all using (auth.role() = 'authenticated');

insert into public.roles (key, label, description) values
  ('ceo', 'CEO', 'Executive view and user administration'),
  ('cto', 'CTO', 'Technical controls, releases, and access oversight'),
  ('qa', 'QA', 'Quality assurance and evidence operations'),
  ('auditor', 'Auditor', 'External or internal audit reviewer')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description;

create table if not exists public.risk_categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  color       text not null default '#64748b',
  description text,
  created_at  timestamptz not null default now()
);

alter table public.risk_categories enable row level security;
drop policy if exists "risk_categories_all" on public.risk_categories;
create policy "risk_categories_all" on public.risk_categories
  for all using (auth.role() = 'authenticated');

insert into public.risk_categories (name)
select distinct category
from (
  select category from public.risks where category is not null
  union
  select category from public.controls where category is not null
) categories
on conflict (name) do nothing;

create table if not exists public.report_templates (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  company_name text not null default 'SIMTEQ AS',
  period_start text not null default 'January 1, 2025',
  period_end   text not null default 'December 31, 2025',
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.report_template_sections (
  id          uuid primary key default uuid_generate_v4(),
  template_id uuid not null references public.report_templates(id) on delete cascade,
  section_key text not null,
  title       text not null,
  body        text not null default '',
  position    integer not null,
  visible     boolean not null default true,
  unique (template_id, section_key)
);

alter table public.report_templates enable row level security;
alter table public.report_template_sections enable row level security;
drop policy if exists "report_templates_all" on public.report_templates;
drop policy if exists "report_template_sections_all" on public.report_template_sections;
create policy "report_templates_all" on public.report_templates
  for all using (auth.role() = 'authenticated');
create policy "report_template_sections_all" on public.report_template_sections
  for all using (auth.role() = 'authenticated');

insert into public.report_templates (name, is_default)
values ('ISAE 3402 Type II - default', true)
on conflict do nothing;

insert into public.report_template_sections (template_id, section_key, title, body, position)
select
  t.id,
  s.section_key,
  s.title,
  s.body,
  s.position
from public.report_templates t
cross join (
  values
    ('cover_subtitle', 'Cover subtitle', 'Independent Assurance Report on Controls at a Service Organization', 0),
    ('sec_1_1', '1.1  Purpose of this Report', 'This report has been prepared by {{company}} in accordance with ISAE 3402. The purpose is to provide user entities and their auditors with information about controls relevant to financial reporting and information security.', 10),
    ('sec_1_2', '1.2  Scope of Services Covered', 'This report covers general IT controls and information security controls operated by {{company}}.', 20),
    ('sec_1_3', '1.3  Period Covered', 'This report covers the period from {{periodStart}} to {{periodEnd}}.', 30),
    ('sec_1_4', '1.4  Intended Users', 'This report is intended for {{company}} management, user entities, and their independent auditors.', 40),
    ('sec_1_5', '1.5  Applicable Standards and Frameworks', 'Controls are designed and operated with reference to ISAE 3402, ISO/IEC 27001, ISO/IEC 27002, NIST SP 800-53, GDPR, and applicable Norwegian data protection requirements.', 50),
    ('sec_2_1', '2.1  Overview of {{company}}', '{{company}} provides managed services, cloud solutions, IT infrastructure support, and information security operations.', 60),
    ('sec_2_3', '2.3  Data Flow and Processing', 'Customer data is processed through secured channels, protected by encryption in transit and at rest, and governed by documented access and retention controls.', 70),
    ('sec_2_4', '2.4  Personnel and Organizational Structure', '{{company}} maintains assigned security and compliance responsibilities, background checks where appropriate, and recurring security awareness training.', 80),
    ('sec_3_1', '3.1  Statement by Management', '{{company}} management is responsible for designing, implementing, and maintaining effective internal controls for the reporting period.', 90),
    ('sec_4_1', '4.  Complementary User Entity Controls (CUEC)', 'The controls described in this report assume that user entities have implemented relevant complementary controls.', 100),
    ('sec_5_1', '5.  Sub-service Organizations', '{{company}} uses sub-service organizations where relevant. User entities should obtain separate assurance where needed.', 110),
    ('sec_8_intro', '8.  Independent Auditor''s Assurance Report', 'To: The Management of {{company}} and its User Entities.', 120),
    ('sec_13_recs', '13.  Recommendations', '1. Prioritize remediation of overdue controls.\n\n2. Maintain formal mitigation plans for high-priority risks.\n\n3. Review complementary user entity controls with relevant customers.', 130),
    ('footer', 'Closing note', 'This report was generated by ComplianceOS on behalf of {{company}}.', 140)
) as s(section_key, title, body, position)
where t.is_default
on conflict (template_id, section_key) do nothing;

create table if not exists public.notification_log (
  id              uuid primary key default uuid_generate_v4(),
  kind            text not null,
  recipient_email text not null,
  subject         text not null,
  body            text,
  related_type    text,
  related_id      text,
  status          text not null default 'queued',
  created_at      timestamptz not null default now()
);

alter table public.notification_log enable row level security;
drop policy if exists "notification_log_all" on public.notification_log;
create policy "notification_log_all" on public.notification_log
  for all using (auth.role() = 'authenticated');

alter table public.reminders
  add column if not exists control_id text references public.controls(id) on delete cascade,
  add column if not exists last_sent_at timestamptz;
