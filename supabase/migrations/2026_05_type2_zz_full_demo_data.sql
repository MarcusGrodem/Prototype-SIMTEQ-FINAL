-- ============================================================
-- Full demo data pass
-- Fills every major application surface with realistic sample data.
-- Re-runnable.
-- ============================================================

create extension if not exists "uuid-ossp";

create or replace function public.seed_full_demo_data()
returns void
language plpgsql
as $$
begin

-- Align older schemas with the fields used by the current app.
alter table public.change_logs
  add column if not exists change_type text,
  add column if not exists environment text,
  add column if not exists approved_by_name text,
  add column if not exists related_risk_id text references public.risks(id) on delete set null,
  add column if not exists related_control_id text references public.controls(id) on delete set null;

alter table public.policies
  add column if not exists last_reviewed date,
  add column if not exists next_review date,
  add column if not exists related_control_id text references public.controls(id) on delete set null;

alter table public.risks drop constraint if exists risks_status_check;
alter table public.risks add constraint risks_status_check
  check (status in ('Active','Mitigated','Monitoring','Closed'));

alter table public.change_logs drop constraint if exists change_logs_status_check;
alter table public.change_logs add constraint change_logs_status_check
  check (status in ('Draft','Pending Approval','Approved','Rejected','Deployed','In Review'));

alter table public.change_logs drop constraint if exists change_logs_change_type_check;
alter table public.change_logs add constraint change_logs_change_type_check
  check (change_type is null or change_type in ('Release','Configuration','Access','Code','Infrastructure'));

alter table public.change_logs drop constraint if exists change_logs_environment_check;
alter table public.change_logs add constraint change_logs_environment_check
  check (environment is null or environment in ('Production','Staging','Development'));

update public.change_logs
set
  change_type = coalesce(change_type,
    case
      when category ilike '%security%' then 'Configuration'
      when category ilike '%infrastructure%' then 'Infrastructure'
      when category ilike '%compliance%' then 'Code'
      else 'Release'
    end),
  environment = coalesce(environment, 'Production'),
  approved_by_name = coalesce(approved_by_name,
    case when status in ('Approved','Deployed') then 'Erik Sørensen' end),
  status = case when status = 'In Review' then 'Pending Approval' else status end,
  related_control_id = coalesce(related_control_id,
    case
      when change_id = 'CHG-001' then 'C003'
      when change_id = 'CHG-002' then 'C038'
      when change_id = 'CHG-003' then 'C034'
      when change_id = 'CHG-004' then 'C046'
      when change_id = 'CHG-005' then 'C051'
      when change_id = 'CHG-006' then 'C042'
      when change_id = 'CHG-007' then 'C043'
      when change_id = 'CHG-008' then 'C018'
    end);

-- Control objectives and RCM links.
insert into public.control_objectives (id, title, description, risk_area, evidence_requirement, in_scope) values
  ('10000000-0000-4000-8000-000000000001','Access is restricted to authorized personnel','Logical access is granted, reviewed, and removed according to role and business need.','Tilgangskontroll','Quarterly access review, MFA export, privileged account evidence.',true),
  ('10000000-0000-4000-8000-000000000002','Suppliers are governed through security obligations','Critical suppliers are assessed, contracted, and monitored against SIMTEQ security requirements.','Leverandørstyring','Supplier register, contract review, annual vendor risk assessment.',true),
  ('10000000-0000-4000-8000-000000000003','Security incidents are identified and resolved','Incidents are detected, triaged, escalated, and reviewed for lessons learned.','Sikkerhetshendelser','Incident register, tabletop evidence, post-incident review records.',true),
  ('10000000-0000-4000-8000-000000000004','Services remain available through disruption','Continuity, backup, and recovery controls support contracted service availability.','Kontinuitet','BCP test, backup restore log, DR exercise summary.',true),
  ('10000000-0000-4000-8000-000000000005','Regulatory obligations are monitored','GDPR, ISO 27001, and ISAE control obligations are reviewed and evidenced.','Etterlevelse','Compliance review minutes, regulatory tracker, internal audit report.',true),
  ('10000000-0000-4000-8000-000000000006','Personnel understand security responsibilities','Employees complete training and follow personnel security procedures.','Personal','Training completion export, phishing simulation report, offboarding checklist.',true),
  ('10000000-0000-4000-8000-000000000007','Premises and equipment are physically protected','Office, device, and media controls reduce physical access and loss risks.','Fysisk sikkerhet','Physical access review, clean desk audit, visitor log.',true),
  ('10000000-0000-4000-8000-000000000008','Data is protected through its lifecycle','Classification, encryption, backup, and disposal controls protect customer data.','Datasikkerhet','DLP review, encryption evidence, retention and disposal log.',true),
  ('10000000-0000-4000-8000-000000000009','Technology operations are controlled','Infrastructure, patching, vulnerability management, logging, and monitoring are operated consistently.','Teknologi','Patch report, vulnerability scan, SIEM review, configuration baseline.',true),
  ('10000000-0000-4000-8000-000000000010','Changes are authorized, tested, and traceable','Application and infrastructure changes are reviewed, tested, approved, and released with rollback evidence.','Applikasjonssikkerhet','Change tickets, code review evidence, release approval records.',true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  risk_area = excluded.risk_area,
  evidence_requirement = excluded.evidence_requirement,
  in_scope = excluded.in_scope;

update public.controls set control_objective_id = case
  when category = 'Tilgangskontroll' then '10000000-0000-4000-8000-000000000001'::uuid
  when category = 'Leverandørstyring' then '10000000-0000-4000-8000-000000000002'::uuid
  when category = 'Sikkerhetshendelser' then '10000000-0000-4000-8000-000000000003'::uuid
  when category = 'Kontinuitet' then '10000000-0000-4000-8000-000000000004'::uuid
  when category = 'Etterlevelse' then '10000000-0000-4000-8000-000000000005'::uuid
  when category = 'Personal' then '10000000-0000-4000-8000-000000000006'::uuid
  when category = 'Fysisk sikkerhet' then '10000000-0000-4000-8000-000000000007'::uuid
  when category = 'Datasikkerhet' then '10000000-0000-4000-8000-000000000008'::uuid
  when category in ('Teknologi','Drift','Nettverkssikkerhet','Overvåkning','Kryptografi') then '10000000-0000-4000-8000-000000000009'::uuid
  when category = 'Applikasjonssikkerhet' then '10000000-0000-4000-8000-000000000010'::uuid
  else control_objective_id
end;

-- Audit periods and executions.
insert into public.audit_periods (id, name, start_date, end_date, freeze_date, report_due_date, status, auditor) values
  ('20000000-0000-4000-8000-000000000001','ISAE 3402 Type II 2026 H1','2026-01-01','2026-06-30','2026-07-05','2026-07-31','active','KPMG Assurance'),
  ('20000000-0000-4000-8000-000000000002','ISAE 3402 Type II 2025 H2','2025-07-01','2025-12-31','2026-01-05','2026-01-31','closed','KPMG Assurance'),
  ('20000000-0000-4000-8000-000000000003','ISAE 3402 Type II 2026 H2','2026-07-01','2026-12-31','2027-01-05','2027-01-31','planned','KPMG Assurance')
on conflict (id) do update set
  name = excluded.name,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  freeze_date = excluded.freeze_date,
  report_due_date = excluded.report_due_date,
  status = excluded.status,
  auditor = excluded.auditor;

insert into public.control_executions (
  id, control_id, audit_period_id, scheduled_due_date, performed_date, performed_by_name,
  status, reviewer_status, reviewed_by_name, reviewed_date, comments
)
select
  uuid_generate_v5(uuid_ns_url(), 'complianceos:execution:2026h1:' || c.id),
  c.id,
  '20000000-0000-4000-8000-000000000001'::uuid,
  coalesce(c.next_due, '2026-06-30'::date),
  case when c.status = 'Completed' then coalesce(c.last_execution, coalesce(c.next_due, '2026-06-30'::date) - interval '7 days')::date end,
  case when c.status = 'Completed' then c.owner_name end,
  case
    when c.status = 'Completed' then 'completed'
    when c.status = 'Overdue' then 'overdue'
    when c.id in ('C002','C010','C017','C024','C037') then 'in_progress'
    else 'scheduled'
  end,
  case
    when c.status = 'Completed' and c.id in ('C007','C018','C035','C048') then 'approved'
    when c.status = 'Completed' then 'pending'
    when c.status = 'Overdue' then 'rejected'
    else 'pending'
  end,
  case when c.status = 'Completed' and c.id in ('C007','C018','C035','C048') then 'Lena Bakke' end,
  case when c.status = 'Completed' and c.id in ('C007','C018','C035','C048') then coalesce(c.last_execution, current_date) end,
  case
    when c.status = 'Completed' then 'Execution evidence uploaded for auditor review.'
    when c.status = 'Overdue' then 'Execution missed SLA and is tracked as a deviation.'
    else 'Scheduled in active audit period.'
  end
from public.controls c
on conflict (id) do update set
  scheduled_due_date = excluded.scheduled_due_date,
  performed_date = excluded.performed_date,
  performed_by_name = excluded.performed_by_name,
  status = excluded.status,
  reviewer_status = excluded.reviewer_status,
  reviewed_by_name = excluded.reviewed_by_name,
  reviewed_date = excluded.reviewed_date,
  comments = excluded.comments;

-- Evidence documents, versions, and links. One generated evidence item for every completed control,
-- plus explicit pending/rejected examples for review queues.
insert into public.documents (
  id, name, file_type, file_size, file_path, uploaded_by_name, current_version,
  reviewer_status, reviewer_comment, reviewed_by_name, reviewed_date, created_at
)
select
  uuid_generate_v5(uuid_ns_url(), 'complianceos:document:' || c.id),
  lower(c.id || '-' || regexp_replace(c.title, '[^a-zA-Z0-9]+', '-', 'g')) || '.pdf',
  'application/pdf',
  1200000 + (row_number() over (order by c.id) * 37000),
  'demo/evidence/' || c.id || '.pdf',
  c.owner_name,
  1,
  case
    when c.id in ('C007','C018','C035','C048') then 'approved'
    when c.id in ('C013','C032') then 'rejected'
    else 'pending'
  end,
  case
    when c.id in ('C007','C018','C035','C048') then 'Evidence accepted for Type II testing.'
    when c.id in ('C013','C032') then 'Document needs clearer population and date range.'
    else null
  end,
  case when c.id in ('C007','C018','C035','C048','C013','C032') then 'Lena Bakke' end,
  case when c.id in ('C007','C018','C035','C048','C013','C032') then coalesce(c.last_execution, current_date) end,
  coalesce(c.last_execution, current_date)::timestamptz
from public.controls c
where c.status = 'Completed'
on conflict (id) do update set
  name = excluded.name,
  file_size = excluded.file_size,
  file_path = excluded.file_path,
  uploaded_by_name = excluded.uploaded_by_name,
  reviewer_status = excluded.reviewer_status,
  reviewer_comment = excluded.reviewer_comment,
  reviewed_by_name = excluded.reviewed_by_name,
  reviewed_date = excluded.reviewed_date;

insert into public.document_versions (id, document_id, version, file_path, file_size, changelog, uploaded_by_name)
select
  uuid_generate_v5(uuid_ns_url(), 'complianceos:document-version:' || c.id),
  uuid_generate_v5(uuid_ns_url(), 'complianceos:document:' || c.id),
  1,
  'demo/evidence/' || c.id || '.pdf',
  1200000 + (row_number() over (order by c.id) * 37000),
  'Initial audit evidence package.',
  c.owner_name
from public.controls c
where c.status = 'Completed'
on conflict (id) do update set
  file_path = excluded.file_path,
  file_size = excluded.file_size,
  changelog = excluded.changelog,
  uploaded_by_name = excluded.uploaded_by_name;

insert into public.document_links (id, document_id, link_type, link_id, execution_id)
select
  uuid_generate_v5(uuid_ns_url(), 'complianceos:document-link:' || c.id),
  uuid_generate_v5(uuid_ns_url(), 'complianceos:document:' || c.id),
  'control',
  c.id,
  uuid_generate_v5(uuid_ns_url(), 'complianceos:execution:2026h1:' || c.id)
from public.controls c
where c.status = 'Completed'
on conflict (id) do update set
  document_id = excluded.document_id,
  link_type = excluded.link_type,
  link_id = excluded.link_id,
  execution_id = excluded.execution_id;

insert into public.document_links (id, document_id, link_type, link_id)
select
  uuid_generate_v5(uuid_ns_url(), 'complianceos:risk-document-link:' || rc.risk_id || ':' || rc.control_id),
  uuid_generate_v5(uuid_ns_url(), 'complianceos:document:' || rc.control_id),
  'risk',
  rc.risk_id
from public.risk_controls rc
join public.controls c on c.id = rc.control_id and c.status = 'Completed'
where rc.risk_id in ('R001','R002','R003','R004','R008','R011','R013')
on conflict (id) do update set
  document_id = excluded.document_id,
  link_type = excluded.link_type,
  link_id = excluded.link_id;

-- Deviations and remediation actions.
insert into public.deviations (
  id, control_id, execution_id, audit_period_id, severity, type, description,
  detected_date, root_cause, audit_impact, status, owner_name
) values
  ('30000000-0000-4000-8000-000000000001','C004',uuid_generate_v5(uuid_ns_url(), 'complianceos:execution:2026h1:C004'),'20000000-0000-4000-8000-000000000001','high','late_execution','Privileged access review was not completed before the quarterly deadline.','2026-01-07','Reviewer capacity during year-end close was insufficient.','Auditor may increase access control testing sample size.','under_remediation','Lars Hansen'),
  ('30000000-0000-4000-8000-000000000002','C015',uuid_generate_v5(uuid_ns_url(), 'complianceos:execution:2026h1:C015'),'20000000-0000-4000-8000-000000000001','critical','failed_control','DR failover test did not meet the documented recovery time objective.','2026-02-03','Legacy queue worker required manual restart.','Potential operating effectiveness exception for continuity objective.','open','Thomas Berg'),
  ('30000000-0000-4000-8000-000000000003','C026',uuid_generate_v5(uuid_ns_url(), 'complianceos:execution:2026h1:C026'),'20000000-0000-4000-8000-000000000001','medium','missing_evidence','Annual security awareness training evidence is incomplete for contractors.','2026-02-15','Contractor LMS export was not included in the evidence pack.','Scope limitation risk until contractor completion is documented.','retesting','Lena Bakke'),
  ('30000000-0000-4000-8000-000000000004','C035',uuid_generate_v5(uuid_ns_url(), 'complianceos:execution:2026h1:C035'),'20000000-0000-4000-8000-000000000001','low','incomplete_approval','Reviewer requested additional timestamp evidence for malware scan export.','2026-03-16','Automated export omitted the report generation timestamp.','Low audit impact after re-upload.','closed','Jonas Pettersen')
on conflict (id) do update set
  severity = excluded.severity,
  type = excluded.type,
  description = excluded.description,
  detected_date = excluded.detected_date,
  root_cause = excluded.root_cause,
  audit_impact = excluded.audit_impact,
  status = excluded.status,
  owner_name = excluded.owner_name;

insert into public.remediation_actions (
  id, deviation_id, action_description, owner_name, due_date, closed_date,
  closure_evidence, retest_required, retest_result, status
) values
  ('31000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Complete privileged access review and attach manager sign-off.','Lars Hansen','2026-04-15',null,null,true,'not_tested','open'),
  ('31000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Run corrected DR failover test with queue worker automation enabled.','Thomas Berg','2026-04-05',null,null,true,'not_tested','overdue'),
  ('31000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','Upload contractor LMS completion export and reconcile attendee list.','Lena Bakke','2026-03-31',null,'contractor-lms-export-q1.pdf',true,'passed','closed'),
  ('31000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','Re-upload malware evidence with generated timestamp and reviewer note.','Jonas Pettersen','2026-03-20','2026-03-18','malware-scan-mars-2026-v2.pdf',false,'passed','closed')
on conflict (id) do update set
  action_description = excluded.action_description,
  owner_name = excluded.owner_name,
  due_date = excluded.due_date,
  closed_date = excluded.closed_date,
  closure_evidence = excluded.closure_evidence,
  retest_required = excluded.retest_required,
  retest_result = excluded.retest_result,
  status = excluded.status;

-- Auditor requests.
insert into public.auditor_requests (
  id, audit_period_id, auditor, request_text, related_control, owner_name,
  due_date, status, response, submitted_date
) values
  ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','KPMG Assurance','Provide population export for all user access changes in Q1 2026.','C001','Lars Hansen','2026-04-12','open',null,'2026-03-28'),
  ('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','KPMG Assurance','Upload evidence showing MFA enforcement for administrators.','C003','Maria Chen','2026-04-05','answered','Azure AD MFA conditional access export uploaded and linked to C003.','2026-03-25'),
  ('40000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','KPMG Assurance','Clarify remediation plan for DR failover exception.','C015','Thomas Berg','2026-04-02','accepted','Retest scheduled with automation fix; remediation action RA-002 tracks completion.','2026-03-22'),
  ('40000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001','KPMG Assurance','Confirm supplier security review covered Microsoft and SMS gateway.','C006','Maria Chen','2026-03-30','closed','Supplier review memo and signed contract extracts accepted by auditor.','2026-03-12')
on conflict (id) do update set
  auditor = excluded.auditor,
  request_text = excluded.request_text,
  related_control = excluded.related_control,
  owner_name = excluded.owner_name,
  due_date = excluded.due_date,
  status = excluded.status,
  response = excluded.response,
  submitted_date = excluded.submitted_date;

-- Products, releases, and release changelog entries.
insert into public.products (id, name, description, owner_name) values
  ('50000000-0000-4000-8000-000000000001','2CLICK Core','Accounting automation platform covering ingestion, validation, workflow, and accounting output delivery.','Mads Grude'),
  ('50000000-0000-4000-8000-000000000002','2CLICK Hospitality','Hotel and hospitality finance workflows with PMS, bank, and ERP integrations.','Erik Sørensen'),
  ('50000000-0000-4000-8000-000000000003','ComplianceOS','Internal ISAE 3402 compliance workspace for controls, evidence, exceptions, and auditor requests.','Lena Bakke')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  owner_name = excluded.owner_name;

update public.releases
set product_name = case
  when version in ('v2.1.0','v2.2.0','v2.3.0') then '2CLICK Core'
  when version = 'v2.4.0' then 'ComplianceOS'
  when version = 'v2.5.0' then '2CLICK Hospitality'
  else coalesce(product_name, '2CLICK Core')
end,
environment = coalesce(environment, 'Production'),
approved_by_name = coalesce(approved_by_name, case when status = 'Released' then 'Erik Sørensen' end),
approved_at = coalesce(approved_at, case when status = 'Released' then (release_date::timestamptz + interval '9 hours') end);

insert into public.release_changes (id, release_id, change_type, description)
select uuid_generate_v5(uuid_ns_url(), 'complianceos:release-change:' || r.id::text || ':1'), r.id, 'Security', 'Enforced MFA and strengthened privileged account controls across production systems.'
from public.releases r where r.version = 'v2.1.0'
on conflict (id) do update set description = excluded.description;

insert into public.release_changes (id, release_id, change_type, description)
select uuid_generate_v5(uuid_ns_url(), 'complianceos:release-change:' || r.id::text || ':2'), r.id, 'Performance', 'Improved database query performance and added connection pool monitoring.'
from public.releases r where r.version = 'v2.2.0'
on conflict (id) do update set description = excluded.description;

insert into public.release_changes (id, release_id, change_type, description)
select uuid_generate_v5(uuid_ns_url(), 'complianceos:release-change:' || r.id::text || ':3'), r.id, 'Feature', 'Added auditor evidence exports and release approval metadata.'
from public.releases r where r.version = 'v2.4.0'
on conflict (id) do update set description = excluded.description;

insert into public.release_changes (id, release_id, change_type, description)
select uuid_generate_v5(uuid_ns_url(), 'complianceos:release-change:' || r.id::text || ':4'), r.id, 'Security', 'Planned zero-trust network segmentation controls for hospitality integrations.'
from public.releases r where r.version = 'v2.5.0'
on conflict (id) do update set description = excluded.description;

-- Policies: populate the fields used by the QA policy screen.
update public.policies set
  last_reviewed = coalesce(last_reviewed, (review_date - interval '1 year')::date),
  next_review = coalesce(next_review, review_date),
  related_control_id = coalesce(related_control_id,
    case
      when title ilike '%access%' then 'C001'
      when title ilike '%incident%' then 'C010'
      when title ilike '%continuity%' then 'C014'
      when title ilike '%supplier%' then 'C006'
      when title ilike '%cryptography%' then 'C031'
      when title ilike '%physical%' then 'C026'
      when title ilike '%change%' then 'C038'
      when title ilike '%vulnerability%' then 'C035'
      else 'C019'
    end);

-- Notification log.
insert into public.notification_log (
  id, kind, recipient_email, subject, body, related_type, related_id, status, created_at
) values
  ('60000000-0000-4000-8000-000000000001','reminder','lars.hansen@simteq.no','Privileged access review overdue','C004 is overdue and has an open remediation action.','control','C004','sent','2026-03-20 08:30:00+00'),
  ('60000000-0000-4000-8000-000000000002','manual','lena.bakke@simteq.no','Evidence review queue updated','New pending evidence is ready for QA review.','control','C013','sent','2026-03-21 12:10:00+00'),
  ('60000000-0000-4000-8000-000000000003','invite','auditor@kpmg.example','Auditor workspace access','Read-only auditor access prepared for ISAE 3402 H1 testing.','user','auditor','mock','2026-03-22 15:45:00+00'),
  ('60000000-0000-4000-8000-000000000004','reminder','thomas.berg@simteq.no','DR remediation due','Critical continuity deviation requires retest evidence.','control','C015','failed','2026-03-24 07:15:00+00')
on conflict (id) do update set
  kind = excluded.kind,
  recipient_email = excluded.recipient_email,
  subject = excluded.subject,
  body = excluded.body,
  related_type = excluded.related_type,
  related_id = excluded.related_id,
  status = excluded.status,
  created_at = excluded.created_at;

end;
$$;
