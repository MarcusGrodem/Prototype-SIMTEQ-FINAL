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
insert into public.releases (version, title, description, status, release_date, author_name) values
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
