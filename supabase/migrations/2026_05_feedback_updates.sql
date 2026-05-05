-- ============================================================
-- Feedback updates – run after schema.sql / seed.sql
-- Adds: risk_categories, report_templates, notification_log,
-- expanded reminders columns, and helper trigger.
-- Re-runnable.
-- ============================================================

-- 1. RISK CATEGORIES (managed lookup) -----------------------------
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

-- Seed from existing distinct values in risks + controls
insert into public.risk_categories (name)
select distinct category from public.risks
where category is not null
on conflict (name) do nothing;

insert into public.risk_categories (name)
select distinct category from public.controls
where category is not null
on conflict (name) do nothing;


-- 2. REPORT TEMPLATES ------------------------------------------------
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
  section_key text not null,           -- stable identifier (e.g. 'cover', 'sec_1_1')
  title       text not null,           -- displayed heading
  body        text not null default '',-- prose body (\n\n separates paragraphs, leading "•" = bullet)
  position    integer not null,
  visible     boolean not null default true,
  unique (template_id, section_key)
);

alter table public.report_templates         enable row level security;
alter table public.report_template_sections enable row level security;
drop policy if exists "report_templates_all"         on public.report_templates;
drop policy if exists "report_template_sections_all" on public.report_template_sections;
create policy "report_templates_all"         on public.report_templates         for all using (auth.role() = 'authenticated');
create policy "report_template_sections_all" on public.report_template_sections for all using (auth.role() = 'authenticated');

-- Seed one default template
do $$
declare t_id uuid;
begin
  if not exists (select 1 from public.report_templates where is_default) then
    insert into public.report_templates (name, is_default)
    values ('ISAE 3402 Type II — default', true)
    returning id into t_id;

    insert into public.report_template_sections (template_id, section_key, title, body, position) values
      (t_id, 'cover_subtitle', 'Cover subtitle',
        'Independent Assurance Report on Controls at a Service Organization', 0),
      (t_id, 'sec_1_1', '1.1  Purpose of this Report',
        E'This report has been prepared by {{company}} in accordance with the International Standard on Assurance Engagements (ISAE) 3402 – "Assurance Reports on Controls at a Service Organization." The purpose of this report is to provide {{company}}''s user entities (customers) and their independent auditors with information about the controls in place at {{company}} that are likely to be relevant to user entities'' internal control over financial reporting and information security.\n\nThe report covers the design and operating effectiveness of controls throughout the reporting period. It is intended to assist user entities in understanding the nature of controls operated by {{company}} and to support their own risk assessments and auditor engagement processes.', 10),
      (t_id, 'sec_1_2', '1.2  Scope of Services Covered',
        E'This report covers the general IT controls and information security controls operated by {{company}} in connection with its accounting automation platform and related advisory services. Publicly described services include 2CLICK by SIMTEQ, 2CLICK for Hospitality, ERP implementation, financial advisory and reporting, ERP/bank/PMS integrations, invoice recognition, bank clearing, expense management, and secure payment automation. Source: https://simteq.com/.', 20),
      (t_id, 'sec_1_3', '1.3  Period Covered',
        E'This report covers the period from {{periodStart}} to {{periodEnd}}. Controls have been tested throughout this entire period to confirm operating effectiveness, consistent with ISAE 3402 Type II requirements.', 30),
      (t_id, 'sec_1_4', '1.4  Intended Users',
        E'This report is intended solely for the use of {{company}} management, existing user entities, and their independent auditors. It should not be distributed to or relied upon by any party other than those specified. {{company}} accepts no responsibility for any party acting, or refraining from action, in reliance on this report other than the intended users.', 40),
      (t_id, 'sec_1_5', '1.5  Applicable Standards and Frameworks',
        E'Controls described in this report are designed and operated with reference to the following standards and frameworks:\n\n• ISAE 3402 – International Standard on Assurance Engagements (Type II)\n• ISO/IEC 27001:2022 – Information Security Management Systems\n• ISO/IEC 27002:2022 – Information Security Controls\n• NIST SP 800-53 – Security and Privacy Controls for Information Systems\n• Norwegian Personal Data Act (Personopplysningsloven) and EU GDPR', 50),
      (t_id, 'sec_2_1', '2.1  Overview of {{company}}',
        E'{{company}} is a Danish accounting automation and financial technology company. Its public website describes SIMTEQ as providing automation that empowers accounting, including the 2CLICK platform for bookkeeping and financial management and 2CLICK for Hospitality for hotel and hospitality finance workflows. Website: https://simteq.com/.', 60),
      (t_id, 'sec_2_3', '2.3  Data Flow and Processing',
        E'Customer data is received by {{company}} through encrypted channels (TLS 1.2 or higher) and processed within isolated environments. Data classification is applied upon ingestion and governs retention, encryption, and access policies. {{company}} does not process personal data beyond what is strictly necessary for service delivery, and all such processing is governed by data processing agreements (DPAs) with each user entity.\n\nData in transit is encrypted using industry-standard protocols. Data at rest is encrypted using AES-256. Encryption keys are managed through a dedicated key management service with rotation policies enforced on a rolling basis.', 70),
      (t_id, 'sec_2_4', '2.4  Personnel and Organizational Structure',
        E'{{company}} maintains a dedicated Information Security function led by the Chief Information Security Officer (CISO), reporting directly to senior management. The organization employs qualified personnel with certifications including CISSP, CISM, ISO 27001 Lead Auditor, and relevant vendor certifications.\n\nAll personnel with access to customer data or systems undergo background checks prior to employment and receive annual information security awareness training. Access privileges are reviewed quarterly and are revoked immediately upon termination of employment.', 80),
      (t_id, 'sec_3_1', '3.1  Statement by Management',
        E'{{company}} management confirms that this report accurately describes the company''s general IT controls and information security controls for the period {{periodStart}} to {{periodEnd}}. The description covers the control objectives established by management, the actual controls implemented, and the conditions under which these controls operate.\n\nManagement is responsible for designing, implementing, and maintaining effective internal controls. This report has been prepared to provide relevant information to user entities and their auditors regarding the controls in place at {{company}}.', 90),
      (t_id, 'sec_4_1', '4.  Complementary User Entity Controls (CUEC)',
        E'The controls described in this report are designed with the assumption that user entities have implemented certain complementary controls. {{company}}''s controls alone are not sufficient to achieve all control objectives; user entities must implement complementary controls to complete the overall control environment. User entity auditors should evaluate whether these complementary controls have been effectively implemented.', 100),
      (t_id, 'sec_5_1', '5.  Sub-service Organizations',
        E'{{company}} uses certain sub-service organizations in the delivery of services to user entities. This report uses the carve-out method for sub-service organizations, meaning the description and tests of controls do not include controls at these organizations. User entities and their auditors should obtain separate assurance reports for sub-service providers where relevant.', 110),
      (t_id, 'sec_8_intro', '8.  Independent Auditor''s Assurance Report',
        E'To: The Management of {{company}} and its User Entities.\n\nWe have examined the description of {{company}}''s General IT Controls and information security controls for the period {{periodStart}} to {{periodEnd}}, and have performed tests of the design and operating effectiveness of those controls necessary to form an opinion in accordance with ISAE 3402.', 120),
      (t_id, 'sec_13_recs', '13.  Recommendations',
        E'1. Prioritize remediation of overdue controls; assign dedicated owners and set target completion dates within 30 days.\n2. Develop and implement formal mitigation plans for high-priority risks; senior management should review progress monthly.\n3. Ensure all user entities have reviewed and implemented the Complementary User Entity Controls (CUECs).\n4. Continue annual testing of the Business Continuity and Disaster Recovery plans.\n5. Review and update the Access Control Matrix following any organizational changes to ensure least-privilege principles are maintained.', 130),
      (t_id, 'footer', 'Closing note',
        E'This report was generated by ComplianceOS on behalf of {{company}}. For official ISAE 3402 Type II certification, engage a qualified third-party auditor holding ISAE accreditation.', 140);
  end if;
end$$;


-- 3. NOTIFICATION LOG (mock email send) ------------------------------
create table if not exists public.notification_log (
  id              uuid primary key default uuid_generate_v4(),
  kind            text not null,                    -- 'reminder', 'invite', 'manual'
  recipient_email text not null,
  subject         text not null,
  body            text,
  related_type    text,                             -- 'control','risk','user'
  related_id      text,
  status          text not null default 'queued',   -- 'queued','sent','failed','mock'
  created_at      timestamptz not null default now()
);

alter table public.notification_log enable row level security;
drop policy if exists "notification_log_all" on public.notification_log;
create policy "notification_log_all" on public.notification_log
  for all using (auth.role() = 'authenticated');


-- 4. REMINDERS – attach to a control instead of being user-global ----
alter table public.reminders
  add column if not exists control_id text references public.controls(id) on delete cascade,
  add column if not exists last_sent_at timestamptz;
