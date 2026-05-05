-- ============================================================
-- ISAE 3402 Compliance Dashboard – Seed Data
-- Run AFTER schema.sql in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- DEMO USERS
-- NOTE: Create these users in Supabase Auth Dashboard first
-- (Authentication > Users > Invite / Add User), then update
-- the profile rows below with the correct UUIDs.
--
-- Suggested credentials:
--   ceo@simteq.no  / demo1234  role: ceo
--   cto@simteq.no  / demo1234  role: cto
--   qa@simteq.no   / demo1234  role: qa
--   qa2@simteq.no  / demo1234  role: qa
--   auditor@simteq.no / demo1234 role: ceo
--
-- After creating users, run:
--   UPDATE public.profiles SET role='ceo', full_name='Erik Sørensen', department='Executive'
--     WHERE email='ceo@simteq.no';
--   UPDATE public.profiles SET role='cto', full_name='Mads Grude', department='Technology'
--     WHERE email='cto@simteq.no';
--   UPDATE public.profiles SET role='qa',  full_name='Lena Bakke', department='Quality Assurance'
--     WHERE email='qa@simteq.no';
--   UPDATE public.profiles SET role='qa',  full_name='Jonas Pettersen', department='Quality Assurance'
--     WHERE email='qa2@simteq.no';
--   UPDATE public.profiles SET role='ceo', full_name='Anna Holm', department='Compliance'
--     WHERE email='auditor@simteq.no';
-- ============================================================

-- ============================================================
-- RISKS  (R001 – R013)
-- ============================================================
insert into public.roles (key, label, description) values
  ('ceo', 'CEO', 'Executive view and user administration'),
  ('cto', 'CTO', 'Technical controls, releases, and access oversight'),
  ('qa', 'QA', 'Quality assurance and evidence operations'),
  ('auditor', 'Auditor', 'External or internal audit reviewer')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description;

insert into public.risks (id, title, category, likelihood, impact, risk_score, status, owner_name, description, last_review) values
  ('R001','Unauthorized Data Access','Tilgangskontroll','High','High',9,'Active','Lars Hansen','Risk of unauthorized users gaining access to sensitive customer data through privilege escalation or stolen credentials.','2025-11-15'),
  ('R002','Third-Party Vendor Breach','Leverandørstyring','Medium','High',6,'Active','Maria Chen','Critical business data processed by third-party vendors may be exposed due to inadequate security controls.','2025-11-20'),
  ('R003','Regulatory Non-Compliance','Etterlevelse','Low','High',3,'Mitigated','Erik Sørensen','Failure to comply with GDPR, ISO 27001, or NIS2 requirements leading to regulatory penalties.','2025-12-01'),
  ('R004','System Downtime','Kontinuitet','Medium','Medium',4,'Active','Anna Holm','Extended service outages impacting business continuity and SLA commitments.','2025-11-25'),
  ('R005','Data Loss Incident','Datasikkerhet','Low','High',3,'Mitigated','Thomas Berg','Permanent loss of critical business data due to hardware failure, ransomware, or accidental deletion.','2025-12-05'),
  ('R006','Insider Threat','Personal','Medium','High',6,'Active','Lena Bakke','Malicious or negligent actions by employees or contractors causing data breaches or system damage.','2025-11-18'),
  ('R007','Phishing Attack','Sikkerhetshendelser','High','Medium',6,'Active','Jonas Pettersen','Employees falling victim to phishing emails leading to credential compromise or malware installation.','2025-11-22'),
  ('R008','Inadequate Patch Management','Teknologi','Medium','Medium',4,'Active','Lars Hansen','Unpatched software vulnerabilities exploited by attackers due to delayed or missed security updates.','2025-11-28'),
  ('R009','Physical Security Breach','Fysisk sikkerhet','Low','High',3,'Mitigated','Maria Chen','Unauthorized physical access to data centers or offices leading to hardware theft or tampering.','2025-12-10'),
  ('R010','Encryption Failure','Datasikkerhet','Low','High',3,'Active','Erik Sørensen','Sensitive data transmitted or stored without proper encryption, exposing it to interception.','2025-11-30'),
  ('R011','DDoS Attack','Nettverkssikkerhet','Medium','Medium',4,'Active','Thomas Berg','Distributed denial-of-service attacks disrupting availability of customer-facing services.','2025-12-03'),
  ('R012','Inadequate Logging','Etterlevelse','High','Low',3,'Active','Anna Holm','Insufficient audit logging making it impossible to detect, investigate, or prove compliance.','2025-11-26'),
  ('R013','Supply Chain Attack','Leverandørstyring','Low','High',3,'Active','Lena Bakke','Compromise of software or hardware components through tampered supply chain deliverables.','2025-12-08');

-- ============================================================
-- CONTROLS  (C001 – C053)
-- ============================================================
insert into public.controls (id, title, category, frequency, status, owner_name, description, last_execution, next_due) values
  ('C001','Access Review','Tilgangskontroll','Monthly','Completed','Lars Hansen','Monthly review of all user access rights and privileges.','2026-02-28','2026-03-31'),
  ('C002','Password Policy Audit','Tilgangskontroll','Quarterly','Pending','Lars Hansen','Audit of password complexity and rotation compliance.','2025-12-31','2026-03-31'),
  ('C003','MFA Compliance Check','Tilgangskontroll','Monthly','Completed','Maria Chen','Verify multi-factor authentication is enabled for all users.','2026-02-28','2026-03-31'),
  ('C004','Privileged Access Review','Tilgangskontroll','Quarterly','Overdue','Lars Hansen','Review and certify all privileged and admin account access.','2025-09-30','2025-12-31'),
  ('C005','Account Deprovisioning','Tilgangskontroll','Monthly','Completed','Maria Chen','Ensure terminated employee accounts are disabled within 24 hours.','2026-02-28','2026-03-31'),
  ('C006','Vendor Risk Assessment','Leverandørstyring','Yearly','Completed','Maria Chen','Annual risk assessment of all critical third-party vendors.','2025-12-31','2026-12-31'),
  ('C007','Vendor Contract Review','Leverandørstyring','Yearly','Pending','Erik Sørensen','Annual review of vendor contracts and SLAs.','2025-06-30','2026-06-30'),
  ('C008','Third-Party Audit','Leverandørstyring','Yearly','Completed','Lena Bakke','Independent security audit of critical vendors.','2025-11-30','2026-11-30'),
  ('C009','Vendor Access Log Review','Leverandørstyring','Monthly','Completed','Maria Chen','Monthly review of all vendor remote access logs.','2026-02-28','2026-03-31'),
  ('C010','Incident Response Drill','Sikkerhetshendelser','Quarterly','Pending','Jonas Pettersen','Tabletop exercise testing incident response procedures.','2025-12-31','2026-03-31'),
  ('C011','Incident Log Review','Sikkerhetshendelser','Monthly','Completed','Jonas Pettersen','Review of all security incident tickets and resolutions.','2026-02-28','2026-03-31'),
  ('C012','Security Alert Triage','Sikkerhetshendelser','Monthly','Completed','Jonas Pettersen','Review and triage of SIEM alerts and security notifications.','2026-02-28','2026-03-31'),
  ('C013','Post-Incident Review','Sikkerhetshendelser','Quarterly','Pending','Lena Bakke','Formal post-incident analysis and lessons-learned documentation.','2025-12-31','2026-03-31'),
  ('C014','BCP Test','Kontinuitet','Yearly','Completed','Anna Holm','Annual business continuity plan test and validation.','2025-10-31','2026-10-31'),
  ('C015','DR Failover Test','Kontinuitet','Quarterly','Overdue','Thomas Berg','Disaster recovery failover test to verify RTO/RPO targets.','2025-09-30','2025-12-31'),
  ('C016','Backup Verification','Kontinuitet','Monthly','Completed','Thomas Berg','Monthly test restore from backup to verify data integrity.','2026-02-28','2026-03-31'),
  ('C017','BCP Update','Kontinuitet','Yearly','Pending','Anna Holm','Annual update of the business continuity plan.','2025-03-31','2026-03-31'),
  ('C018','GDPR Compliance Review','Etterlevelse','Quarterly','Completed','Erik Sørensen','Quarterly review of GDPR data processing activities and compliance.','2025-12-31','2026-03-31'),
  ('C019','ISO 27001 Internal Audit','Etterlevelse','Yearly','Completed','Lena Bakke','Annual internal audit against ISO 27001 controls.','2025-11-30','2026-11-30'),
  ('C020','Regulatory Change Monitoring','Etterlevelse','Monthly','Completed','Erik Sørensen','Monthly review of regulatory updates affecting the organization.','2026-02-28','2026-03-31'),
  ('C021','Policy Compliance Audit','Etterlevelse','Quarterly','Pending','Lena Bakke','Quarterly audit of internal policy compliance across departments.','2025-12-31','2026-03-31'),
  ('C022','Security Awareness Training','Personal','Yearly','Completed','Lena Bakke','Annual mandatory security awareness training for all staff.','2025-12-31','2026-12-31'),
  ('C023','Phishing Simulation','Personal','Quarterly','Completed','Jonas Pettersen','Simulated phishing campaign to test employee awareness.','2025-12-31','2026-03-31'),
  ('C024','Background Check Review','Personal','Yearly','Pending','Lena Bakke','Annual review of background check procedures for new hires.','2025-03-31','2026-03-31'),
  ('C025','HR Offboarding Checklist','Personal','Monthly','Completed','Lena Bakke','Verify all offboarding checklists are completed for departing staff.','2026-02-28','2026-03-31'),
  ('C026','Physical Access Review','Fysisk sikkerhet','Quarterly','Overdue','Maria Chen','Review of physical access card assignments and permissions.','2025-09-30','2025-12-31'),
  ('C027','CCTV Log Review','Fysisk sikkerhet','Monthly','Completed','Maria Chen','Monthly review of CCTV footage logs for anomalies.','2026-02-28','2026-03-31'),
  ('C028','Data Center Access Audit','Fysisk sikkerhet','Quarterly','Pending','Thomas Berg','Audit of data center access logs and visitors register.','2025-12-31','2026-03-31'),
  ('C029','Clean Desk Policy Check','Fysisk sikkerhet','Monthly','Completed','Maria Chen','Random checks for compliance with clean desk policy.','2026-02-28','2026-03-31'),
  ('C030','Data Classification Review','Datasikkerhet','Quarterly','Completed','Erik Sørensen','Review and update data classification inventory.','2025-12-31','2026-03-31'),
  ('C031','Encryption Key Rotation','Datasikkerhet','Yearly','Pending','Thomas Berg','Annual rotation of all encryption keys.','2025-04-30','2026-04-30'),
  ('C032','DLP Policy Review','Datasikkerhet','Quarterly','Completed','Lars Hansen','Review data loss prevention rules and effectiveness.','2025-12-31','2026-03-31'),
  ('C033','Database Encryption Audit','Datasikkerhet','Yearly','Completed','Thomas Berg','Verify encryption is applied to all databases at rest.','2025-12-31','2026-12-31'),
  ('C034','Patch Management Review','Teknologi','Monthly','Completed','Thomas Berg','Review patch levels for all production systems.','2026-02-28','2026-03-31'),
  ('C035','Vulnerability Scan','Teknologi','Monthly','Overdue','Jonas Pettersen','External and internal vulnerability scans of all systems.','2026-01-31','2026-02-28'),
  ('C036','Penetration Test','Teknologi','Yearly','Completed','Jonas Pettersen','Annual penetration test of external-facing infrastructure.','2025-09-30','2026-09-30'),
  ('C037','Software Inventory Review','Teknologi','Quarterly','Pending','Thomas Berg','Review and update software asset inventory.','2025-12-31','2026-03-31'),
  ('C038','Change Management Review','Teknologi','Monthly','Completed','Mads Grude','Review of all change requests and approvals in the period.','2026-02-28','2026-03-31'),
  ('C039','Capacity Planning Review','Drift','Quarterly','Pending','Thomas Berg','Review infrastructure capacity metrics and forecasts.','2025-12-31','2026-03-31'),
  ('C040','SLA Compliance Review','Drift','Monthly','Completed','Anna Holm','Review service level achievement against contracted targets.','2026-02-28','2026-03-31'),
  ('C041','Operational Runbook Review','Drift','Yearly','Pending','Thomas Berg','Annual review and update of operational runbooks.','2025-03-31','2026-03-31'),
  ('C042','Firewall Rule Review','Nettverkssikkerhet','Quarterly','Completed','Lars Hansen','Review and clean up firewall rules for all network segments.','2025-12-31','2026-03-31'),
  ('C043','Network Segmentation Audit','Nettverkssikkerhet','Yearly','Completed','Lars Hansen','Verify network segmentation controls are properly implemented.','2025-10-31','2026-10-31'),
  ('C044','VPN Access Review','Nettverkssikkerhet','Monthly','Completed','Lars Hansen','Review of VPN user accounts and connection logs.','2026-02-28','2026-03-31'),
  ('C045','IDS/IPS Signature Update','Nettverkssikkerhet','Monthly','Completed','Jonas Pettersen','Verify IDS/IPS signatures are up to date.','2026-02-28','2026-03-31'),
  ('C046','Web Application Firewall Review','Applikasjonssikkerhet','Monthly','Completed','Jonas Pettersen','Review WAF rules and blocked requests.','2026-02-28','2026-03-31'),
  ('C047','SAST/DAST Scan','Applikasjonssikkerhet','Quarterly','Pending','Jonas Pettersen','Static and dynamic application security testing.','2025-12-31','2026-03-31'),
  ('C048','API Security Review','Applikasjonssikkerhet','Quarterly','Completed','Jonas Pettersen','Review API authentication and authorization controls.','2025-12-31','2026-03-31'),
  ('C049','Code Review Process Audit','Applikasjonssikkerhet','Quarterly','Pending','Mads Grude','Verify all code changes go through security-aware code review.','2025-12-31','2026-03-31'),
  ('C050','Log Retention Audit','Etterlevelse','Quarterly','Completed','Erik Sørensen','Verify log retention periods comply with policy and regulations.','2025-12-31','2026-03-31'),
  ('C051','SIEM Rule Review','Sikkerhetshendelser','Quarterly','Pending','Jonas Pettersen','Review and update SIEM detection rules.','2025-12-31','2026-03-31'),
  ('C052','Organisational Chart Review','Organisatoriske foranstaltninger','Yearly','Completed','Erik Sørensen','Annual review of organisational structure and responsibilities.','2025-12-31','2026-12-31'),
  ('C053','Risk Register Review','Etterlevelse','Quarterly','Completed','Lena Bakke','Quarterly review and update of the risk register.','2025-12-31','2026-03-31');

-- ============================================================
-- RISK_CATEGORIES  (managed lookup from risks + controls)
-- ============================================================
insert into public.risk_categories (name)
select distinct category
from (
  select category from public.risks where category is not null
  union
  select category from public.controls where category is not null
) categories
on conflict (name) do nothing;

-- ============================================================
-- RISK_CONTROLS  (mappings)
-- ============================================================
insert into public.risk_controls (risk_id, control_id) values
  ('R001','C001'),('R001','C003'),('R001','C004'),('R001','C005'),
  ('R002','C006'),('R002','C007'),('R002','C008'),('R002','C009'),
  ('R003','C018'),('R003','C019'),('R003','C020'),('R003','C050'),
  ('R004','C014'),('R004','C015'),('R004','C016'),('R004','C039'),
  ('R005','C016'),('R005','C031'),('R005','C033'),
  ('R006','C022'),('R006','C023'),('R006','C025'),
  ('R007','C022'),('R007','C023'),
  ('R008','C034'),('R008','C035'),('R008','C037'),
  ('R009','C026'),('R009','C027'),('R009','C028'),
  ('R010','C031'),('R010','C033'),
  ('R011','C042'),('R011','C043'),('R011','C045'),
  ('R012','C011'),('R012','C012'),('R012','C050'),
  ('R013','C006'),('R013','C008'),('R013','C049');

-- ============================================================
-- COMPLIANCE_EVENTS
-- ============================================================
insert into public.compliance_events (title, date, type, status, description, control_id) values
  ('ISO 27001 External Audit','2026-04-15','audit','Upcoming','Annual external ISO 27001 certification audit.','C019'),
  ('GDPR DPA Compliance Review','2026-03-31','review','Upcoming','Quarterly GDPR data processing activities review.','C018'),
  ('Q1 Access Rights Certification','2026-03-31','deadline','Upcoming','Complete Q1 access certification for all users.','C001'),
  ('Security Awareness Training Deadline','2026-04-30','training','Upcoming','All staff must complete annual security training by this date.','C022'),
  ('Q1 Phishing Simulation','2026-03-28','training','Upcoming','Scheduled Q1 phishing simulation campaign.','C023'),
  ('Penetration Test Scoping','2026-05-01','audit','Upcoming','Scoping session for annual external penetration test.','C036'),
  ('BCP Tabletop Exercise','2026-06-15','review','Upcoming','Annual business continuity tabletop exercise.','C014'),
  ('ISAE 3402 Type II Period Start','2026-01-01','audit','Completed','Start of the current ISAE 3402 Type II audit period.',null),
  ('Q4 2025 DR Test','2025-12-15','deadline','Completed','Disaster recovery failover test completed successfully.','C015'),
  ('Annual Vendor Risk Review','2025-12-31','review','Completed','Completed annual risk assessment of all critical vendors.','C006'),
  ('ISO 27001 Internal Audit','2025-11-30','audit','Completed','Internal ISO 27001 audit completed with 3 minor findings.','C019'),
  ('Q4 Firewall Rule Review','2025-12-20','review','Completed','Q4 firewall rule cleanup and documentation update.','C042'),
  ('GDPR Legitimate Basis Review Overdue','2026-02-28','deadline','Overdue','Review of legitimate processing bases was not completed.','C018'),
  ('Privileged Access Recertification Overdue','2025-12-31','deadline','Overdue','Q4 privileged access certification was not completed.','C004'),
  ('NIS2 Gap Assessment','2026-07-01','review','Upcoming','Gap assessment against NIS2 requirements ahead of compliance deadline.',null);

-- ============================================================
-- ALERTS
-- ============================================================
insert into public.alerts (title, message, type, is_read) values
  ('Overdue Controls','4 controls are past their due date and require immediate attention.','error',false),
  ('Upcoming Certification','ISO 27001 external audit scheduled for 15 April 2026. Prepare evidence packages.','warning',false),
  ('Access Review Due','Q1 2026 quarterly access certification is due by 31 March 2026.','warning',false),
  ('Patch Scan Overdue','Monthly vulnerability scan for February 2026 has not been completed.','error',false),
  ('New Vendor Onboarded','Vendor CloudHost AS added – schedule initial risk assessment within 30 days.','info',true),
  ('Training Completion','87% of staff have completed annual security awareness training.','info',true),
  ('Risk Register Updated','Risk register reviewed and updated by QA team on 28 March 2026.','success',true);

-- ============================================================
-- CHANGE_LOGS  (CHG-001 – CHG-008)
-- ============================================================
insert into public.change_logs (change_id, title, description, author_name, status, category, impact) values
  ('CHG-001','Enable MFA for all admin accounts','Enforced multi-factor authentication for all administrator and privileged accounts across all systems.','Mads Grude','Deployed','Security','High'),
  ('CHG-002','Migrate to PostgreSQL 16','Database migration from PostgreSQL 14 to 16 to take advantage of performance improvements and extended support.','Mads Grude','Deployed','Infrastructure','Medium'),
  ('CHG-003','Implement automated patch deployment','Deploy automated patching pipeline for OS and middleware using Ansible, reducing patch deployment time from 14 days to 24 hours.','Thomas Berg','Deployed','Infrastructure','High'),
  ('CHG-004','API rate limiting rollout','Implement rate limiting on all public APIs to mitigate DDoS and brute-force attacks.','Jonas Pettersen','Deployed','Security','Medium'),
  ('CHG-005','SIEM rule update – ransomware detection','Add 12 new detection rules to SIEM for ransomware behaviour patterns and lateral movement indicators.','Jonas Pettersen','Deployed','Security','Critical'),
  ('CHG-006','Deprecate legacy TLS 1.0/1.1','Disable TLS 1.0 and 1.1 across all endpoints; enforce TLS 1.2 minimum.','Lars Hansen','Approved','Security','High'),
  ('CHG-007','Network segmentation redesign','Redesign internal network segments to isolate production, development, and management traffic.','Lars Hansen','In Review','Infrastructure','Critical'),
  ('CHG-008','GDPR consent management upgrade','Upgrade consent management platform to support granular consent records required under new DPA guidance.','Erik Sørensen','Draft','Compliance','Medium');

-- ============================================================
-- RELEASES  (v2.1.0 – v2.5.0)
-- ============================================================
insert into public.releases (version, title, description, status, release_date, released_by_name) values
  ('v2.1.0','Security Hardening Release','Enforcement of MFA, legacy TLS deprecation, firewall rule cleanup and automated patch deployment pipeline.','Released','2026-01-15','Mads Grude'),
  ('v2.2.0','Database & Performance Update','PostgreSQL 16 migration, query optimisation, connection pooling improvements and index tuning.','Released','2026-02-10','Mads Grude'),
  ('v2.3.0','Threat Detection Enhancement','New SIEM rules for ransomware and lateral movement detection, API rate limiting, WAF rule updates.','Released','2026-03-05','Thomas Berg'),
  ('v2.4.0','Compliance & Audit Features','Automated compliance report generation, improved audit trail logging, GDPR consent management upgrade.','In Progress','2026-04-01','Erik Sørensen'),
  ('v2.5.0','Network Segmentation & Zero Trust','Full network segmentation redesign, zero-trust access model implementation and certificate lifecycle automation.','Planned','2026-06-01','Lars Hansen');

-- ============================================================
-- POLICIES  (ISO 27001 areas)
-- ============================================================
insert into public.policies (title, category, version, status, owner_name, review_date, description) values
  ('Information Security Policy','Organisatoriske foranstaltninger','3.2','Active','Erik Sørensen','2026-12-31','Top-level information security policy establishing management commitment and security objectives in accordance with ISO 27001 clause 5.'),
  ('Access Control Policy','Tilgangskontroll','2.1','Active','Lars Hansen','2026-06-30','Policy governing user access provisioning, role-based access control, privileged access management and access reviews.'),
  ('Data Classification and Handling Policy','Datasikkerhet','2.0','Active','Erik Sørensen','2026-09-30','Framework for classifying information assets and defining handling, storage and disposal requirements for each classification level.'),
  ('Incident Response Policy','Sikkerhetshendelser','1.4','Active','Jonas Pettersen','2026-06-30','Procedures for detecting, reporting, assessing and responding to information security incidents.'),
  ('Business Continuity Policy','Kontinuitet','1.2','Active','Anna Holm','2026-12-31','Policy establishing requirements for business continuity planning, disaster recovery and regular testing of continuity arrangements.'),
  ('Acceptable Use Policy','Personal','2.3','Active','Lena Bakke','2026-06-30','Rules governing acceptable use of organisational IT resources, internet access and communication systems.'),
  ('Supplier Security Policy','Leverandørstyring','1.1','Active','Maria Chen','2026-09-30','Requirements for information security in supplier relationships including risk assessments, contractual clauses and ongoing monitoring.'),
  ('Cryptography Policy','Datasikkerhet','1.0','Under Review','Thomas Berg','2026-03-31','Policy on the use of cryptographic controls including key management, approved algorithms and certificate lifecycle management.'),
  ('Physical Security Policy','Fysisk sikkerhet','1.3','Active','Maria Chen','2026-12-31','Controls for securing physical premises, equipment and media against unauthorised access, theft and environmental hazards.'),
  ('Change Management Policy','Teknologi','2.0','Active','Mads Grude','2026-06-30','Formal change management process covering request, assessment, approval, implementation and review of all changes to production systems.'),
  ('Vulnerability Management Policy','Teknologi','1.1','Active','Jonas Pettersen','2026-09-30','Requirements for regular vulnerability scanning, risk-based patching and penetration testing of IT systems and applications.'),
  ('Data Retention and Disposal Policy','Etterlevelse','1.2','Draft','Erik Sørensen','2026-03-31','Policy defining retention periods for different categories of data and secure disposal procedures to meet legal and regulatory requirements.');

-- ============================================================
-- REPORT_TEMPLATES  (default audit report template)
-- ============================================================
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
     'This report has been prepared by {{company}} in accordance with the International Standard on Assurance Engagements (ISAE) 3402, "Assurance Reports on Controls at a Service Organization," issued by the International Auditing and Assurance Standards Board (IAASB).

The purpose of this report is to provide management of {{company}}, user entities of its services, and their independent auditors with information about the general IT controls and information security controls in place at {{company}} that may be relevant to user entities'' internal control over financial reporting and information security risk management.

This is an ISAE 3402 Type II report, meaning it covers both the suitability of design and the operating effectiveness of controls throughout the reporting period from {{periodStart}} to {{periodEnd}}.', 10),

    ('sec_1_2', '1.2  Scope of Services Covered',
     'This report covers the general IT controls and information security controls operated by {{company}} in connection with its accounting automation platform and related advisory services. Publicly described services include 2CLICK by SIMTEQ, 2CLICK for Hospitality, ERP implementation, financial advisory and reporting, ERP/bank/PMS integrations, invoice recognition, bank clearing, expense management, and secure payment automation.

The following service components are within scope of this report:
• Core accounting automation platform and workflow engine
• Customer-facing portals and API endpoints
• ERP, bank, PMS, and payment integration services
• Invoice recognition and expense management modules
• Secure payment automation workflows
• Identity and access management for in-scope systems
• Operational monitoring and support functions

Services or systems not explicitly listed above are out of scope for this report.', 20),

    ('sec_1_3', '1.3  Period Covered',
     'This report covers the period from {{periodStart}} to {{periodEnd}}. Controls have been tested by the auditor throughout this entire period, not solely at a point in time. Where controls were modified during the period, the auditor has tested both the prior and revised versions of the control where applicable.', 30),

    ('sec_1_4', '1.4  Intended Users',
     'This report is intended solely for the use of {{company}} management, existing user entities of {{company}}''s services as of {{periodEnd}}, and their independent auditors. It should not be used by any other party or for any other purpose.

Prospective user entities and their auditors may use this report when evaluating the controls at {{company}} as part of their due diligence process, subject to agreement with {{company}} management.', 40),

    ('sec_1_5', '1.5  Applicable Standards and Frameworks',
     'The control framework implemented by {{company}} and assessed in this report is aligned with the following standards and frameworks:

• ISAE 3402 — International Standard on Assurance Engagements 3402 (primary assurance standard)
• ISO/IEC 27001:2022 — Information Security Management System requirements
• ISO/IEC 27002:2022 — Information security controls guidance
• NIST SP 800-53 Rev. 5 — Security and Privacy Controls for Information Systems
• GDPR (EU) 2016/679 — General Data Protection Regulation
• ISO 31000:2018 — Risk management guidelines
• CIS Controls v8 — Center for Internet Security critical security controls', 50),

    ('sec_2_1', '2.1  Overview of {{company}}',
     '{{company}} is a Danish accounting automation and financial technology company. Its public website describes SIMTEQ as providing automation that empowers accounting, including the 2CLICK platform for bookkeeping and financial management and 2CLICK for Hospitality for hotel and hospitality finance workflows. Website: https://simteq.com/.

{{company}} serves a range of user entities requiring automated, reliable, and secure processing of financial data. The company is committed to maintaining a robust information security posture that protects the confidentiality, integrity, and availability of customer data and the reliability of the services delivered.', 60),

    ('sec_2_3', '2.3  Data Flow and Processing',
     'Customer data is received by {{company}} through encrypted channels (TLS 1.2 or higher) and processed within isolated tenant environments. The following data lifecycle applies to in-scope services:

• Ingestion: Customer data is submitted via authenticated API endpoints or secure file transfer. All transmissions are encrypted in transit. Inbound data is authenticated and authorised before acceptance.

• Validation and Processing: Received data is validated for format integrity and completeness prior to processing. Automated workflow engines apply business logic and transformations within compute resources isolated per tenant. No cross-tenant data access is permitted at any processing layer.

• Storage: Processed data and documents are stored in encrypted data stores. Encryption at rest uses AES-256 or equivalent standards. Logical separation is enforced at the data and access layer.

• Output and Delivery: Results (reports, notifications, exports) are delivered to authorised recipients via authenticated, encrypted channels. Delivery confirmations are logged and retained.

• Retention and Disposal: Customer data is retained in accordance with contractual terms and applicable legal requirements including GDPR. At end-of-retention, data is securely deleted or anonymised using documented disposal procedures, and all disposals are recorded.', 70),

    ('sec_2_4', '2.4  Personnel and Organizational Structure',
     '{{company}} maintains a dedicated Information Security function. The Chief Information Security Officer (CISO) reports directly to senior management and chairs the Information Security Steering Committee. Key security roles include: Information Security Manager, IT Operations Lead, Compliance Officer, Data Protection Officer (DPO), and a dedicated Security Operations function.

All personnel with access to in-scope systems undergo documented background checks prior to employment and sign confidentiality agreements as a condition of employment. Role-specific security awareness training is completed during onboarding and repeated annually as a mandatory requirement.

Upon role change or departure, all access rights are revoked within one business day, triggered automatically by the HR system integration. Contractor and third-party personnel with system access are subject to equivalent background and access controls under the terms of their engagement agreements.', 80),

    ('sec_3_1', '3.1  Statement by {{company}} Management',
     '{{company}} management confirms that this report accurately describes the company''s general IT controls and information security controls as designed and implemented throughout the period from {{periodStart}} to {{periodEnd}}.

Management acknowledges its responsibility for:
• Designing, implementing, and maintaining effective controls
• Identifying and assessing risks to the achievement of control objectives
• Monitoring the ongoing performance of controls and remediating deficiencies
• Ensuring this description fairly presents the system as it operated during the reporting period

This statement has been approved by {{company}} senior management prior to issuance of this report.', 90),

    ('sec_4_1', '4.1  Overview of Complementary User Entity Controls',
     'The controls described in this report are designed with the assumption that certain complementary controls have been implemented by user entities. {{company}}''s controls alone are not sufficient to achieve all stated control objectives — the achievement of certain objectives relies on controls that must be operated by user entities.

User entities that have implemented the complementary controls described in this section can reasonably rely on {{company}}''s controls to achieve the related control objectives. User entities should consider whether they have implemented the required complementary controls when assessing the impact of this report on their own internal control environments.

User entities'' auditors should consider the relevance of these complementary controls when planning their audit work.', 100),

    ('sec_5_1', '5.1  Use of Sub-service Organizations',
     '{{company}} uses certain sub-service organizations in the delivery of services to user entities. The use of sub-service organizations is managed through {{company}}''s supplier security program, which includes vendor risk assessments, contractual security requirements, and periodic review of third-party assurance reports where available.

User entities and their auditors who require assurance over the controls at these sub-service organizations should request and review separate assurance reports from those organizations where available, or review alternative evidence of control effectiveness such as vendor certifications, penetration test summaries, or contractual audit rights.', 110),

    ('sec_8_intro', '8.  Independent Auditor''s Assurance Report',
     'To: The Management of {{company}} and its User Entities.

We have examined the description of {{company}}''s General IT Controls and information security controls for the period {{periodStart}} to {{periodEnd}}, as set out in Sections 1 through 7 of this report, and the suitability of the design and operating effectiveness of those controls to achieve the related control objectives stated in Section 9.

Our examination was conducted in accordance with the International Standard on Assurance Engagements (ISAE) 3402, "Assurance Reports on Controls at a Service Organization." That standard requires that we comply with ethical requirements and plan and perform our procedures to obtain reasonable assurance about whether, in all material respects, (a) the description fairly presents the system as designed and implemented throughout the period, (b) the controls related to the stated control objectives were suitably designed, and (c) the controls operated effectively throughout the stated period.', 120),

    ('sec_13_recs', '15.  Recommendations',
     '1. Controls and Remediation: Prioritize remediation of any overdue controls identified in this report. Assign dedicated owners, define target completion dates within 30 days, and track progress in the compliance management system with monthly reporting to the CISO.

2. Risk Management: Develop and implement formal mitigation plans for any high-priority risks (score 7–9) identified in the risk register. Senior management should review progress monthly. Ensure risk assessments are updated within 30 days of any material change to the operating environment.

3. Complementary User Entity Controls: Ensure all active user entities have reviewed, acknowledged, and implemented the Complementary User Entity Controls (CUECs) documented in Section 4. Maintain records of CUEC acknowledgements and review annually.

4. Business Continuity Testing: Continue annual testing of the Business Continuity and Disaster Recovery plans. Document lessons learned and update plans within 60 days of each test. Ensure RTO and RPO targets are validated through live failover testing, not tabletop exercises alone.

5. Access Management: Review and update the Access Control Matrix following any organisational changes. Ensure quarterly user access reviews are completed on time and that evidence of review is retained for audit purposes.

6. Data Privacy: Confirm that all processing activities are reflected in the Record of Processing Activities (RoPA) and that Data Protection Impact Assessments (DPIAs) have been completed for all high-risk processing. Review DPA agreements with all data processors annually.

7. Vulnerability Management: Verify that all critical and high-severity vulnerabilities are remediated within the SLAs defined in Section 14. Review penetration test findings and confirm remediation of all identified issues prior to the next reporting period.', 130),

    ('footer', 'Closing note',
     'This report was generated by ComplianceOS on behalf of {{company}}. For official ISAE 3402 Type II certification, engage a qualified third-party auditor holding ISAE accreditation. ComplianceOS provides management reporting and internal compliance monitoring functionality and does not constitute an independent assurance engagement.', 140),

    ('sec_2_2', '2.2  Infrastructure and Technology Components',
     'The {{company}} control environment comprises the following key components:', 150),

    ('sec_2_5', '2.5  Principal Service Commitments and System Requirements',
     '{{company}} has established the following principal service commitments applicable to the in-scope services. These commitments form the basis for the control objectives described in this report and are monitored on a continuous basis through the compliance management system.', 160),

    ('sec_3_2', '3.2  Management Assertion',
     'Based on the criteria established in the ISAE 3402 standard, {{company}} management asserts that:

(i)   The description of the system fairly presents {{company}}''s system as designed and implemented throughout the period from {{periodStart}} to {{periodEnd}}.

(ii)  The controls related to the stated control objectives were suitably designed throughout the specified period to provide reasonable assurance that those objectives would be achieved if the controls operated effectively.

(iii) The controls tested operated effectively throughout the specified period to provide reasonable assurance that the related control objectives were achieved.

(iv)  {{company}} has implemented complementary sub-service organization controls where applicable, and relies on the controls of sub-service organizations for certain objectives as described in Section 5.', 170),

    ('sec_3_3', '3.3  Responsibility Statement',
     'Management of {{company}} acknowledges its responsibility for monitoring the ongoing performance of controls.', 180),

    ('sec_4_2', '4.2  Required Complementary User Entity Controls',
     '', 190),

    ('sec_5_trail', 'Section 5 trailing paragraph',
     '{{company}} performs periodic due diligence reviews of sub-service organizations. Contracts with sub-service organizations should include appropriate security requirements, data processing agreements, and audit or assurance provisions where relevant.', 200),

    ('sec_6_1', '6.1  Control Framework',
     '{{company}} has implemented a comprehensive IT control framework aligned with ISO/IEC 27001:2022. The framework is organized into thirteen control domains, each containing specific control objectives designed to address identified risks to the confidentiality, integrity, and availability of information assets.', 210),

    ('sec_6_2', '6.2  Control Environment Components',
     '', 220),

    ('sec_6_3', '6.3  Governance and Oversight',
     '{{company}} maintains an Information Security Steering Committee that meets quarterly to review the status of the control environment, approve material changes to security policies, and review the risk register. The committee is chaired by the CISO and includes representatives from IT Operations, Legal, Compliance, and senior management.

Internal compliance reviews are conducted semi-annually and findings are tracked in the compliance management system. All findings are assigned an owner, a remediation target date, and a severity rating. Unresolved critical findings are escalated to the Board of Directors.', 230),

    ('sec_6_4', '6.4  Security Policy Framework',
     '{{company}} maintains a comprehensive information security policy framework. All policies are approved by senior management, communicated to relevant personnel, and reviewed at least annually or following significant changes. The policy framework comprises the following key documents:', 240),

    ('sec_6_5', '6.5  Security Awareness and Training Program',
     '{{company}} operates a structured security awareness and training program to ensure all personnel understand their information security responsibilities and are equipped to recognise and respond to current threats. Training completion is tracked centrally and reported to the CISO quarterly.', 250),

    ('sec_6_5_trail', 'Section 6.5 trailing paragraph',
     'Non-completion of mandatory training within the defined window is escalated to the relevant line manager. Persistent non-completion is treated as a disciplinary matter in accordance with the company''s Human Resources policy.', 260),

    ('sec_7_1', '7.1  Risk Management Methodology',
     '{{company}} uses a structured risk management methodology based on ISO 31000 and ISO 27005. Risks are identified through periodic threat assessments, vulnerability scans, incident reviews, and internal audits. Each risk is evaluated using a likelihood × impact scoring matrix on a scale of 1–9, yielding a composite risk score that determines the risk rating and required response.', 270),

    ('sec_7_3', '7.3  Risk Treatment Plan Summary',
     'For each identified risk, {{company}} selects and implements one of the following treatment options in accordance with its risk appetite and the requirements of ISO 31000. Treatment decisions are approved by the CISO and reviewed by the Information Security Steering Committee.', 280),

    ('sec_7_3_trail', 'Section 7.3 trailing paragraph',
     'Residual risk (the risk remaining after treatment) is documented for each risk and reviewed at least semi-annually. All risks with a residual score above the defined risk appetite threshold (score ≥ 7) require formal written acceptance by the CISO and a time-bound mitigation plan. No high-scoring residual risks may remain untreated for more than 90 days without Board-level escalation.', 290),

    ('sec_8_1', '8.1  Auditor Responsibilities',
     'Our responsibility is to express an opinion on the fairness of the presentation of the description and on the design and operating effectiveness of the controls to achieve the related control objectives, based on our examination. We conducted our engagement in accordance with the International Standard on Assurance Engagements (ISAE) 3402, "Assurance Reports on Controls at a Service Organization."

That standard requires that we comply with ethical requirements and plan and perform our procedures to obtain reasonable assurance about whether, in all material respects, the description fairly presents the system as designed and implemented, the controls were suitably designed, and the controls operated effectively throughout the stated period.', 300),

    ('sec_8_2', '8.2  Scope of Testing',
     'Our procedures included examining evidence supporting the description and the design and operating effectiveness of the controls. Our tests of controls included inquiry, observation, inspection of documents and records, and re-performance of controls. We believe our examination provides a reasonable basis for our opinion.', 310),

    ('sec_8_3', '8.3  Our Conclusion',
     'Based on our examination, in our opinion, in all material respects, as at {{periodEnd}}:

(i)   The description fairly presents {{company}}''s system as designed and implemented throughout the period.

(ii)  The controls related to the stated control objectives were suitably designed throughout the period.', 320),

    ('sec_8_4', '8.4  Basis of Opinion',
     'Our examination was conducted in accordance with the criteria established by {{company}} management and set out in Section 6 of this report. We believe the criteria used are suitable and available to user entities and their auditors. Our independence and quality management policies have been applied throughout the engagement.', 330),

    ('sec_8_5', '8.5  Legend',
     'Effective: No material deviations noted; controls operated effectively throughout the period

Review needed: Some weaknesses identified; improvements recommended; controls substantially effective

Exception: Critical weaknesses noted; controls not operating effectively; immediate remediation required', 340),

    ('sec_10_1', '10.1  Change Management Process',
     '{{company}} operates a formal change management process for in-scope systems and services. Changes should be documented, risk-assessed, approved, tested where relevant, and reviewed after implementation according to their urgency and potential impact.', 350),

    ('sec_10_2', '10.2  Testing and Rollback',
     'All Normal changes must include a documented test plan, a rollback procedure, and evidence of successful testing in a non-production environment before CAB approval is granted. Emergency changes undergo a formal post-implementation review within 48 hours of deployment to verify effectiveness and identify any unintended consequences.', 360),

    ('sec_10_3', '10.3  Segregation of Duties in Change Process',
     'No individual is permitted to both request and approve a change to production systems. The CAB includes representatives from Operations, Security, and at least one business stakeholder. Changes affecting security controls or cryptographic configurations require CISO sign-off in addition to standard CAB approval.', 370),

    ('sec_11_1', '11.1  Business Continuity Planning',
     '{{company}} maintains a Business Continuity Plan (BCP) and Disaster Recovery Plan (DRP) that are reviewed and tested annually. The plans define Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) for all critical services, as summarized below.', 380),

    ('sec_11_2', '11.2  Incident Management Process',
     'Security incidents are managed through a formal incident response process covering detection, triage, containment, eradication, recovery, and post-incident review phases. Escalation procedures should define ownership, severity, communication requirements, and target response times.

{{company}} maintains an incident register that records incidents, their classification, root cause analysis, and remediation actions. Incidents affecting customer data are reported to affected user entities in accordance with GDPR and contractual requirements.', 390),

    ('sec_11_3', '11.3  Testing and Exercises',
     'Business continuity and disaster recovery capabilities are tested at least annually through tabletop exercises and live failover tests. Results are documented and used to update the BCP/DRP. The most recent full DR test was completed successfully within the reporting period.', 400),

    ('sec_12_1', '12.1  Access Control Principles',
     '{{company}} enforces the principles of least privilege and need-to-know for access to systems and data. Access rights are granted based on job role and should be documented in an access control matrix. Access requests require formal approval from the relevant system or process owner.', 410),

    ('sec_12_2', '12.2  Identity and Authentication',
     'User accounts should require multi-factor authentication for access to in-scope production systems where supported. Privileged access should be restricted, approved, logged, and subject to periodic review.', 420),

    ('sec_12_3', '12.3  Segregation of Duties',
     '{{company}} enforces segregation of duties (SoD) across key IT processes. Roles with conflicting responsibilities — such as development and production deployment, or request and approval of access — are identified in the SoD matrix and are not permitted to be held by the same individual. Automated controls in the ITSM platform enforce this separation for change management and access request workflows.', 430),

    ('sec_12_4', '12.4  Periodic Access Reviews',
     'All user access rights are reviewed quarterly by system owners. Privileged access is reviewed monthly. Any access rights that are no longer required are revoked within five business days of identification. Access is automatically disabled upon employee termination or role change as triggered by the HR system integration.', 440),

    ('sec_13_1', '13.1  Data Privacy Framework',
     '{{company}} operates a data privacy framework aligned with the General Data Protection Regulation (GDPR) (EU) 2016/679 and applicable national data protection legislation. A Data Protection Officer (DPO) has been appointed and is responsible for monitoring compliance, advising on data protection obligations, and acting as the contact point for supervisory authorities and data subjects.

The privacy framework covers the full lifecycle of personal data processing, from collection and lawful basis documentation through to retention, disposal, and data subject rights fulfilment. Privacy by Design and by Default principles are applied when developing or modifying systems that process personal data.', 450),

    ('sec_13_2', '13.2  Personal Data Processing Activities',
     '{{company}} maintains a Record of Processing Activities (RoPA) as required under GDPR Article 30. The following table summarises the principal categories of personal data processed in connection with in-scope services:', 460),

    ('sec_13_3', '13.3  Data Subject Rights',
     '{{company}} has implemented documented procedures to respond to data subject requests under GDPR Articles 15–22. These include the rights of access, rectification, erasure, restriction of processing, data portability, and objection. All requests are acknowledged within 72 hours and fulfilled within 30 days. Where requests cannot be fulfilled, a reasoned refusal is provided to the data subject.', 470),

    ('sec_13_4', '13.4  Data Breach Notification',
     'In the event of a personal data breach, {{company}} follows a documented breach response procedure. Confirmed breaches involving risk to data subjects are notified to the relevant supervisory authority within 72 hours of discovery (GDPR Art. 33). Where a high risk to individuals is identified, affected data subjects are notified without undue delay (GDPR Art. 34). All breaches, including near-misses, are recorded in the breach register maintained by the DPO.', 480),

    ('sec_13_5', '13.5  Data Protection Impact Assessments (DPIA)',
     '{{company}} conducts Data Protection Impact Assessments for new processing activities that are likely to result in high risk to individuals, as required under GDPR Article 35. DPIA triggers include: introduction of new processing systems, significant changes to existing processing, use of new technologies, large-scale processing of sensitive data, and systematic monitoring. DPIAs are documented, reviewed by the DPO, and approved by the CISO prior to implementation.', 490),

    ('sec_14_1', '14.1  Vulnerability Identification and Classification',
     '{{company}} maintains a formal vulnerability management process covering all in-scope systems. Vulnerabilities are identified through automated scanning, manual assessments, threat intelligence feeds, vendor advisories, and penetration testing. Each identified vulnerability is classified using the Common Vulnerability Scoring System (CVSS) and mapped to a remediation priority based on the following criteria:', 500),

    ('sec_14_2', '14.2  Automated Scanning Program',
     'Automated vulnerability scans are performed on all in-scope systems on a defined schedule. Scan results are reviewed by the IT Operations team, triaged by the CISO, and tracked in the vulnerability management system until remediation is confirmed. False positives are documented with supporting rationale.', 510),

    ('sec_14_3', '14.3  Penetration Testing',
     '{{company}} engages qualified independent third-party security firms to conduct penetration tests of in-scope systems on an annual basis at minimum. Additional targeted tests are commissioned following significant system changes or at the direction of the CISO. Penetration testing scope, methodology, and findings are documented, and remediation of identified findings is tracked to completion.', 520),

    ('sec_14_4', '14.4  Patch Management',
     'Patches and security updates for all in-scope systems are tracked, evaluated, and applied in accordance with the vulnerability remediation SLAs defined in Section 14.1. Patch deployment follows the change management process described in Section 10. Emergency patches for critical vulnerabilities may follow the emergency change process with post-implementation review. Patch compliance rates are monitored monthly and reported to the CISO.

Operating systems, middleware, databases, and third-party libraries are covered by the patch management program. End-of-life (EOL) software and systems are identified, tracked, and subject to a migration or decommission plan approved by the CISO. No EOL systems may remain in production without documented risk acceptance and compensating controls.', 530),

    ('sec_app_b', 'Appendix B – Glossary of Terms',
     '', 540),

    ('sec_app_b_intro', 'Appendix B intro',
     'The following glossary defines key terms used throughout this ISAE 3402 Type II report.', 550),

    ('sec_app_c', 'Appendix C – Audit Evidence and Testing Approach',
     '', 560),

    ('sec_app_c_intro', 'Appendix C intro',
     'This appendix describes the evidence categories and testing procedures used to assess the design and operating effectiveness of controls included in this report. Testing was conducted in accordance with ISAE 3402 requirements and professional auditing standards.', 570),

    ('sec_app_c_1', 'C.1  Evidence Categories',
     '', 580),

    ('sec_app_c_2', 'C.2  Testing Approach by Control Type',
     '', 590),

    ('sec_app_c_3', 'C.3  Sampling Methodology',
     'Where sampling is applied, sample sizes are determined based on the frequency and population size of the control, as follows:', 600),

    ('sec_app_c_3_trail', 'Section C.3 trailing paragraph',
     'Sample items are selected using random or systematic selection methods. Items are selected from across the full reporting period to provide evidence about the entire period and not just point-in-time effectiveness.', 610)

) as s(section_key, title, body, position)
where t.is_default
on conflict (template_id, section_key) do update
  set title = excluded.title,
      body  = excluded.body,
      position = excluded.position;
