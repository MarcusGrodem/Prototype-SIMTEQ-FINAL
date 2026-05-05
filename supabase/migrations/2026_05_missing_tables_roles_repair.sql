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
    ('sec_1_1', '1.1  Purpose of this Report',
     'This report has been prepared by {{company}} in accordance with the International Standard on Assurance Engagements (ISAE) 3402, "Assurance Reports on Controls at a Service Organization," issued by the IAASB.

The purpose of this report is to provide management of {{company}}, user entities of its services, and their independent auditors with information about the general IT controls and information security controls in place at {{company}} that may be relevant to user entities'' internal control over financial reporting and information security risk management.

This is an ISAE 3402 Type II report, covering both the suitability of design and the operating effectiveness of controls throughout the reporting period from {{periodStart}} to {{periodEnd}}.', 10),

    ('sec_1_2', '1.2  Scope of Services Covered',
     'This report covers the general IT controls and information security controls operated by {{company}} in connection with its accounting automation platform and related advisory services. Publicly described services include 2CLICK by SIMTEQ, 2CLICK for Hospitality, ERP implementation, financial advisory and reporting, ERP/bank/PMS integrations, invoice recognition, bank clearing, expense management, and secure payment automation.

The following service components are within scope:
• Core accounting automation platform and workflow engine
• Customer-facing portals and API endpoints
• ERP, bank, PMS, and payment integration services
• Invoice recognition and expense management modules
• Secure payment automation workflows
• Identity and access management for in-scope systems
• Operational monitoring and support functions', 20),

    ('sec_1_3', '1.3  Period Covered',
     'This report covers the period from {{periodStart}} to {{periodEnd}}. Controls have been tested throughout this entire period, not solely at a point in time. Where controls were modified during the period, the auditor has tested both the prior and revised versions of the control where applicable.', 30),

    ('sec_1_4', '1.4  Intended Users',
     'This report is intended solely for the use of {{company}} management, existing user entities of {{company}}''s services as of {{periodEnd}}, and their independent auditors. It should not be used by any other party or for any other purpose.

Prospective user entities and their auditors may use this report when evaluating the controls at {{company}} as part of due diligence, subject to agreement with {{company}} management.', 40),

    ('sec_1_5', '1.5  Applicable Standards and Frameworks',
     'The control framework assessed in this report is aligned with:

• ISAE 3402 — primary assurance standard
• ISO/IEC 27001:2022 — ISMS requirements
• ISO/IEC 27002:2022 — information security controls guidance
• NIST SP 800-53 Rev. 5 — security and privacy controls
• GDPR (EU) 2016/679 — data protection regulation
• ISO 31000:2018 — risk management guidelines
• CIS Controls v8 — critical security controls', 50),

    ('sec_2_1', '2.1  Overview of {{company}}',
     '{{company}} is a Danish accounting automation and financial technology company. Its public website describes SIMTEQ as providing automation that empowers accounting, including the 2CLICK platform for bookkeeping and financial management and 2CLICK for Hospitality for hotel and hospitality finance workflows. Website: https://simteq.com/.

{{company}} serves a range of user entities requiring automated, reliable, and secure processing of financial data and is committed to maintaining a robust information security posture that protects the confidentiality, integrity, and availability of customer data.', 60),

    ('sec_2_3', '2.3  Data Flow and Processing',
     'Customer data is received by {{company}} through encrypted channels (TLS 1.2 or higher) and processed within isolated tenant environments. The following data lifecycle applies:

• Ingestion: Data submitted via authenticated API endpoints or secure file transfer. All transmissions encrypted in transit. Inbound data is authenticated and authorised before acceptance.

• Validation and Processing: Data validated for format integrity before processing. Automated workflow engines apply business logic within compute resources isolated per tenant. No cross-tenant data access is permitted.

• Storage: Data stored in encrypted data stores using AES-256 or equivalent. Logical separation enforced at the data and access layer.

• Output and Delivery: Results delivered to authorised recipients via authenticated, encrypted channels. Delivery confirmations are logged and retained.

• Retention and Disposal: Data retained per contractual terms and GDPR requirements. At end-of-retention, data is securely deleted or anonymised, and all disposals are recorded.', 70),

    ('sec_2_4', '2.4  Personnel and Organizational Structure',
     '{{company}} maintains a dedicated Information Security function. The CISO reports directly to senior management and chairs the Information Security Steering Committee. Key roles include: Information Security Manager, IT Operations Lead, Compliance Officer, Data Protection Officer (DPO), and a Security Operations function.

All personnel with access to in-scope systems undergo background checks prior to employment and sign confidentiality agreements. Role-specific security awareness training is completed during onboarding and repeated annually.

Upon role change or departure, all access rights are revoked within one business day, triggered automatically by the HR system integration. Contractor and third-party personnel are subject to equivalent controls under their engagement agreements.', 80),

    ('sec_3_1', '3.1  Statement by {{company}} Management',
     '{{company}} management confirms that this report accurately describes the company''s general IT controls and information security controls as designed and implemented throughout the period from {{periodStart}} to {{periodEnd}}.

Management acknowledges its responsibility for:
• Designing, implementing, and maintaining effective controls
• Identifying and assessing risks to the achievement of control objectives
• Monitoring ongoing control performance and remediating deficiencies
• Ensuring this description fairly presents the system as it operated during the reporting period

This statement has been approved by {{company}} senior management prior to issuance.', 90),

    ('sec_4_1', '4.1  Overview of Complementary User Entity Controls',
     'The controls described in this report are designed assuming that certain complementary controls have been implemented by user entities. {{company}}''s controls alone are not sufficient to achieve all stated control objectives.

User entities that have implemented the complementary controls described in this section can reasonably rely on {{company}}''s controls to achieve the related control objectives. User entities should consider whether they have implemented the required complementary controls when assessing the impact of this report on their own internal control environments.', 100),

    ('sec_5_1', '5.1  Use of Sub-service Organizations',
     '{{company}} uses certain sub-service organizations in the delivery of services to user entities. Use of sub-service organizations is managed through {{company}}''s supplier security program, which includes vendor risk assessments, contractual security requirements, and periodic review of third-party assurance reports where available.

User entities and their auditors who require assurance over controls at these sub-service organizations should request and review separate assurance reports from those organizations, or review alternative evidence such as vendor certifications, penetration test summaries, or contractual audit rights.', 110),

    ('sec_8_intro', '8.  Independent Auditor''s Assurance Report',
     'To: The Management of {{company}} and its User Entities.

We have examined the description of {{company}}''s General IT Controls and information security controls for the period {{periodStart}} to {{periodEnd}}, as set out in Sections 1 through 7 of this report, and the suitability of the design and operating effectiveness of those controls to achieve the related control objectives stated in Section 9.

Our examination was conducted in accordance with ISAE 3402, "Assurance Reports on Controls at a Service Organization." That standard requires that we comply with ethical requirements and plan and perform our procedures to obtain reasonable assurance about whether, in all material respects, (a) the description fairly presents the system as designed and implemented throughout the period, (b) the controls were suitably designed, and (c) the controls operated effectively throughout the stated period.', 120),

    ('sec_13_recs', '15.  Recommendations',
     '1. Controls and Remediation: Prioritize remediation of any overdue controls. Assign owners, set target dates within 30 days, and track progress with monthly reporting to the CISO.

2. Risk Management: Develop mitigation plans for high-priority risks (score 7–9). Senior management should review progress monthly. Update risk assessments within 30 days of any material change to the operating environment.

3. Complementary User Entity Controls: Ensure all active user entities have reviewed, acknowledged, and implemented the CUECs in Section 4. Maintain records of acknowledgements and review annually.

4. Business Continuity Testing: Continue annual BCP/DRP testing. Document lessons learned and update plans within 60 days. Validate RTO and RPO targets through live failover testing.

5. Access Management: Review the Access Control Matrix following any organisational changes. Ensure quarterly access reviews are completed on time with evidence retained for audit.

6. Data Privacy: Confirm all processing activities are in the RoPA and DPIAs have been completed for high-risk processing. Review DPA agreements with all data processors annually.

7. Vulnerability Management: Verify all critical and high vulnerabilities are remediated within the SLAs in Section 14. Confirm remediation of penetration test findings prior to the next reporting period.', 130),

    ('footer', 'Closing note',
     'This report was generated by ComplianceOS on behalf of {{company}}. For official ISAE 3402 Type II certification, engage a qualified third-party auditor holding ISAE accreditation. ComplianceOS provides management reporting and internal compliance monitoring functionality and does not constitute an independent assurance engagement.', 140)

) as s(section_key, title, body, position)
where t.is_default
on conflict (template_id, section_key) do update
  set title    = excluded.title,
      body     = excluded.body,
      position = excluded.position;

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
