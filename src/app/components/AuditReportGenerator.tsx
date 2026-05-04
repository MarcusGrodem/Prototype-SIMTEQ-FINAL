import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import {
  FileText,
  Sparkles,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Shield,
  TrendingUp,
  Clock,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Risk, Control, ReportTemplate, ReportTemplateSection } from '../../lib/types';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from 'docx';
import jsPDF from 'jspdf';

interface AuditReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ISO_DOMAINS = [
  'Organisatoriske foranstaltninger',
  'Tilgangskontroll',
  'Leverandørstyring',
  'Sikkerhetshendelser',
  'Kontinuitet',
  'Etterlevelse',
  'Personal',
  'Fysisk sikkerhet',
  'Datasikkerhet',
  'Teknologi',
  'Drift',
  'Nettverkssikkerhet',
  'Applikasjonssikkerhet',
];

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  'Organisatoriske foranstaltninger': 'Organizational measures ensuring systematic management of information security through policies, procedures, and governance structures.',
  'Tilgangskontroll': 'Access control measures restricting system access to authorized users and protecting against unauthorized access.',
  'Leverandørstyring': 'Supplier management controls ensuring third-party vendors comply with information security requirements.',
  'Sikkerhetshendelser': 'Security incident management procedures for detecting, reporting, and responding to information security events.',
  'Kontinuitet': 'Business continuity controls ensuring critical services remain available during disruptive events.',
  'Etterlevelse': 'Compliance controls ensuring adherence to legal, regulatory, and contractual requirements including ISAE 3402.',
  'Personal': 'Human resources controls addressing information security responsibilities for employees before, during, and after employment.',
  'Fysisk sikkerhet': 'Physical security controls preventing unauthorized physical access to information systems and facilities.',
  'Datasikkerhet': 'Data security controls protecting the confidentiality, integrity, and availability of information assets.',
  'Teknologi': 'Technology controls managing the secure configuration and operation of information processing systems.',
  'Drift': 'Operational controls ensuring correct and secure operations of information processing facilities.',
  'Nettverkssikkerhet': 'Network security controls protecting the integrity of networks and the information transmitted over them.',
  'Applikasjonssikkerhet': 'Application security controls ensuring security is incorporated throughout the software development lifecycle.',
};

function getStatusSymbol(controls: Control[]): string {
  if (controls.length === 0) return '–';
  const overdue = controls.filter(c => c.status === 'Overdue').length;
  const pending = controls.filter(c => c.status === 'Pending').length;
  if (overdue > 0) return '✗';
  if (pending > controls.length * 0.3) return '⚠';
  return '✓';
}

function getStatusText(symbol: string): string {
  if (symbol === '✓') return 'No material deviations noted';
  if (symbol === '⚠') return 'Minor weaknesses identified — improvements recommended';
  if (symbol === '✗') return 'Critical weaknesses — immediate remediation required';
  return 'No controls defined';
}

export function AuditReportGenerator({ open, onOpenChange }: AuditReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [customInstructions, setCustomInstructions] = useState('');
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [sectionMap, setSectionMap] = useState<Record<string, ReportTemplateSection>>({});
  const [reportData, setReportData] = useState<{
    controls: Control[];
    risks: Risk[];
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: tpls } = await supabase
        .from('report_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .limit(1);
      const tpl = (tpls || [])[0] as ReportTemplate | undefined;
      if (!tpl) return;
      setTemplate(tpl);
      const { data: secs } = await supabase
        .from('report_template_sections')
        .select('*')
        .eq('template_id', tpl.id)
        .order('position');
      const map: Record<string, ReportTemplateSection> = {};
      (secs || []).forEach(s => { map[s.section_key] = s as ReportTemplateSection; });
      setSectionMap(map);
    })();
  }, [open]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    setGenerationProgress(20);
    const [{ data: controlsData }, { data: risksData }] = await Promise.all([
      supabase.from('controls').select('*').order('id'),
      supabase.from('risks').select('*').order('id'),
    ]);
    setGenerationProgress(60);

    await new Promise(r => setTimeout(r, 400));
    setGenerationProgress(100);
    await new Promise(r => setTimeout(r, 300));

    setReportData({
      controls: controlsData || [],
      risks: risksData || [],
    });
    setReportGenerated(true);
    setIsGenerating(false);
  };

  const getReportMeta = () => {
    const now = new Date();
    const periodStart = template?.period_start ?? 'January 1, 2025';
    const periodEnd = template?.period_end ?? 'December 31, 2025';
    const company = template?.company_name ?? 'SIMTEQ AS';
    const generated = now.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    return { periodStart, periodEnd, generated, company };
  };

  // Substitute template placeholders ({{company}}, {{periodStart}}, {{periodEnd}})
  const substitute = (text: string): string => {
    const m = getReportMeta();
    return text
      .replace(/\{\{company\}\}/g, m.company)
      .replace(/\{\{periodStart\}\}/g, m.periodStart)
      .replace(/\{\{periodEnd\}\}/g, m.periodEnd);
  };

  // Returns a section's body (with substitutions) if visible in template, else fallback.
  // Returns null if section exists but is hidden -> caller should skip it.
  const tplBody = (key: string, fallback: string): string | null => {
    const s = sectionMap[key];
    if (!s) return substitute(fallback);
    if (!s.visible) return null;
    return substitute(s.body || fallback);
  };

  const tplTitle = (key: string, fallback: string): string => {
    const s = sectionMap[key];
    if (!s || !s.visible) return substitute(fallback);
    return substitute(s.title || fallback);
  };

  const handleDownloadWord = async () => {
    if (!reportData) return;
    const { controls, risks } = reportData;
    const { periodStart, periodEnd, generated, company } = getReportMeta();

    // Convert a multiline body into Paragraph[].
    // Blank line = paragraph break. Lines starting with "•" or "-" are bullets.
    const bodyParagraphs = (body: string): Paragraph[] => {
      const out: Paragraph[] = [];
      const blocks = body.split(/\n\s*\n/);
      for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('•') || line.startsWith('-')) {
            out.push(new Paragraph({ text: line, spacing: { after: 120 } }));
          } else {
            out.push(new Paragraph({ text: line, spacing: { after: 200 } }));
          }
        }
      }
      return out;
    };

    // Helper: render a templated subsection (heading + body), or skip if hidden in template.
    const tplSubsection = (key: string, fallbackTitle: string, fallbackBody: string): (Paragraph | Table)[] => {
      const body = tplBody(key, fallbackBody);
      if (body === null) return [];
      const title = tplTitle(key, fallbackTitle);
      return [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        ...bodyParagraphs(body),
      ];
    };

    const completed = controls.filter(c => c.status === 'Completed').length;
    const overdue = controls.filter(c => c.status === 'Overdue').length;
    const highRisks = risks.filter(r => r.risk_score >= 7).length;
    const medRisks = risks.filter(r => r.risk_score >= 4 && r.risk_score < 7).length;
    const complianceScore = controls.length > 0
      ? Math.round((completed / controls.length) * 100)
      : 0;

    const hdrCell = (text: string) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: 'ffffff' })] })],
        shading: { type: ShadingType.SOLID, color: '1e3a8a', fill: '1e3a8a' },
      });

    const dataCell = (text: string, opts: { bold?: boolean; color?: string; mono?: boolean } = {}) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text,
            bold: opts.bold,
            size: 18,
            color: opts.color,
            font: opts.mono ? 'Courier New' : undefined,
          })],
        })],
      });

    const p = (text: string, spacing = 200) =>
      new Paragraph({ text, spacing: { after: spacing } });

    const children: (Paragraph | Table)[] = [];

    // ── COVER PAGE ──────────────────────────────────────────────────────────
    const coverSubtitle = tplBody('cover_subtitle', 'Independent Assurance Report on Controls at a Service Organization')
      ?? 'Independent Assurance Report on Controls at a Service Organization';
    children.push(
      new Paragraph({ text: '', spacing: { after: 2400 } }),
      new Paragraph({
        children: [new TextRun({ text: company, bold: true, size: 56, color: '1e3a8a' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'ISAE 3402 TYPE II', bold: true, size: 44 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: coverSubtitle, size: 28, color: '374151' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Reporting period: ${periodStart} – ${periodEnd}`, size: 24, color: '6b7280' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Date of report: ${generated}`, size: 22, color: '9ca3af' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Overall Compliance Score: ${complianceScore}%`, size: 28, bold: true, color: complianceScore >= 85 ? '16a34a' : complianceScore >= 70 ? 'd97706' : 'dc2626' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'CONFIDENTIAL – FOR AUTHORIZED USE ONLY', size: 18, color: 'dc2626', bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200 },
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'dc2626' } },
      }),
    );

    // ── TABLE OF CONTENTS ───────────────────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: 'Table of Contents', heading: HeadingLevel.HEADING_1, spacing: { after: 400 } }),
    );
    const tocEntries = [
      ['1.', 'Scope, Objective and Applicability'],
      ['2.', 'System Description'],
      ['3.', 'Management Statement and Assertion'],
      ['4.', 'Complementary User Entity Controls (CUEC)'],
      ['5.', 'Sub-service Organizations'],
      ['6.', 'Description of the IT Control Environment'],
      ['7.', 'Risk Register'],
      ['8.', "Independent Auditor's Assurance Report"],
      ['9.', 'Control Objectives, Security Measures, Tests and Findings'],
      ['10.', 'Change Management Controls'],
      ['11.', 'Business Continuity and Incident Management'],
      ['12.', 'Access Management and Segregation of Duties'],
      ['13.', 'Summary and Recommendations'],
      ['Appendix A.', 'Complete Control Listing'],
      ['Appendix B.', 'Glossary of Terms'],
    ];
    tocEntries.forEach(([num, title]) => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${num}  `, bold: true, size: 20 }),
          new TextRun({ text: title, size: 20 }),
        ],
        spacing: { after: 120 },
      }));
    });

    // ── SECTION 1: SCOPE, OBJECTIVE AND APPLICABILITY ──────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '1.  Scope, Objective and Applicability', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_1_1', '1.1  Purpose of this Report',
        `This report has been prepared by ${company} in accordance with the International Standard on Assurance Engagements (ISAE) 3402.\n\nThe report covers the design and operating effectiveness of controls throughout the reporting period.`),
      ...tplSubsection('sec_1_2', '1.2  Scope of Services Covered',
        `This report covers the general IT controls and information security controls operated by ${company} in connection with the services provided to user entities.`),
      ...tplSubsection('sec_1_3', '1.3  Period Covered',
        `This report covers the period from ${periodStart} to ${periodEnd}. Controls have been tested throughout this entire period.`),
      ...tplSubsection('sec_1_4', '1.4  Intended Users',
        `This report is intended solely for the use of ${company} management, existing user entities, and their independent auditors.`),
      ...tplSubsection('sec_1_5', '1.5  Applicable Standards and Frameworks',
        '• ISAE 3402\n• ISO/IEC 27001:2022\n• ISO/IEC 27002:2022\n• NIST SP 800-53\n• GDPR'),
      new Paragraph({ text: '', spacing: { after: 300 } }),
    );

    // ── SECTION 2: SYSTEM DESCRIPTION ──────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '2.  System Description', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_2_1', `2.1  Overview of ${company}`,
        `${company} is a Norwegian IT services company.`),
      new Paragraph({ text: '2.2  Infrastructure and Technology Components', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p(`The ${company} service delivery infrastructure comprises the following key components:`),
    );

    const infraRows = [
      ['Component', 'Description', 'Technology'],
      ['Compute', 'Virtualized server infrastructure for customer workloads', 'VMware vSphere, Azure'],
      ['Network', 'Managed network services with segmentation and firewall', 'Cisco, Fortinet, SD-WAN'],
      ['Storage', 'Primary and backup storage with replication', 'NetApp, Azure Blob, S3'],
      ['Identity', 'Centralized identity and access management', 'Azure AD, MFA, PAM'],
      ['Monitoring', 'Real-time infrastructure and security monitoring', 'SIEM, SNMP, Nagios'],
      ['Service Desk', 'ITSM platform for change and incident management', 'ServiceNow'],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: infraRows.map((row, i) => new TableRow({
          children: row.map((cell, j) => i === 0
            ? hdrCell(cell)
            : dataCell(cell, { bold: j === 0 })
          ),
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 300 } }),
      ...tplSubsection('sec_2_3', '2.3  Data Flow and Processing',
        `Customer data is received by ${company} through encrypted channels and processed within isolated environments.`),
      ...tplSubsection('sec_2_4', '2.4  Personnel and Organizational Structure',
        `${company} maintains a dedicated Information Security function led by the CISO.`),
    );

    // ── SECTION 3: MANAGEMENT STATEMENT ────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '3.  Management Statement and Assertion', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_3_1', `3.1  Statement by ${company} Management`,
        `${company} management confirms that this report accurately describes the company's general IT controls and information security controls for the period ${periodStart} to ${periodEnd}.`),
      new Paragraph({ text: '3.2  Management Assertion', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p(`Based on the criteria established in the ISAE 3402 standard, ${company} management asserts that:`),
      p(`(i)   The description of the system fairly presents ${company}'s system as designed and implemented throughout the period from ${periodStart} to ${periodEnd}.`),
      p('(ii)  The controls related to the stated control objectives were suitably designed throughout the specified period to provide reasonable assurance that those objectives would be achieved if the controls operated effectively.'),
      p('(iii) The controls tested operated effectively throughout the specified period to provide reasonable assurance that the related control objectives were achieved.'),
      p(`(iv)  ${company} has implemented complementary sub-service organization controls where applicable, and relies on the controls of sub-service organizations for certain objectives as described in Section 5.`),
      new Paragraph({ text: '3.3  Responsibility Statement', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p(`Management of ${company} acknowledges its responsibility for monitoring the ongoing performance of controls.`),
    );

    // ── SECTION 4: CUEC ─────────────────────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '4.  Complementary User Entity Controls (CUEC)', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_4_1', '4.1  Overview',
        `The controls described in this report are designed with the assumption that user entities have implemented certain complementary controls. ${company}'s controls alone are not sufficient to achieve all control objectives.`),
      new Paragraph({ text: '4.2  Required Complementary User Entity Controls', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
    );

    const cuecRows = [
      ['Control Area', 'Required User Entity Control'],
      ['User Access', 'User entities are responsible for provisioning and revoking access rights for their own employees to the services provided by SIMTEQ AS in a timely manner.'],
      ['Data Classification', 'User entities are responsible for classifying their own data appropriately and communicating data handling requirements to SIMTEQ AS prior to processing.'],
      ['Incident Reporting', 'User entities are responsible for promptly reporting suspected security incidents, unauthorized access, or unusual system behavior to SIMTEQ AS security operations.'],
      ['Change Requests', 'User entities must formally authorize and document all change requests submitted to SIMTEQ AS through the defined change management process.'],
      ['Backup Verification', 'User entities are responsible for periodically verifying the recoverability of their own backups by requesting restore tests in accordance with agreed service levels.'],
      ['Audit Cooperation', 'User entities must cooperate with SIMTEQ AS during security reviews or audits that may affect the security of the shared environment.'],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: cuecRows.map((row, i) => new TableRow({
          children: [
            i === 0 ? hdrCell(row[0]) : dataCell(row[0], { bold: true }),
            i === 0 ? hdrCell(row[1]) : dataCell(row[1]),
          ],
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 300 } }),
    );

    // ── SECTION 5: SUB-SERVICE ORGANIZATIONS ───────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '5.  Sub-service Organizations', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_5_1', '5.1  Use of Sub-service Organizations',
        `${company} uses certain sub-service organizations in the delivery of services to user entities.`),
    );

    const subRows = [
      ['Sub-service Organization', 'Services Provided', 'Applicable Criteria'],
      ['Microsoft Azure (Norway East)', 'Cloud infrastructure, virtual machines, blob storage, Azure AD identity services', 'SOC 2 Type II, ISO 27001'],
      ['Amazon Web Services (EU-WEST)', 'Secondary cloud environment, S3 storage, disaster recovery hosting', 'SOC 2 Type II, ISO 27001'],
      ['Broadcom / VMware', 'On-premises virtualization platform (vSphere) maintenance and licensing', 'Vendor security attestation'],
      ['Iron Mountain Norge', 'Off-site physical media storage and secure document destruction', 'ISO 27001, GDPR compliant'],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: subRows.map((row, i) => new TableRow({
          children: row.map((cell, j) => i === 0 ? hdrCell(cell) : dataCell(cell, { bold: j === 0 })),
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      p('SIMTEQ AS performs annual due diligence reviews of all sub-service organizations, including review of their most recent SOC 2 or equivalent assurance reports. Contracts with sub-service organizations include appropriate security requirements, data processing agreements, and right-to-audit clauses.'),
    );

    // ── SECTION 6: CONTROL ENVIRONMENT ─────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '6.  Description of the IT Control Environment', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      new Paragraph({ text: '6.1  Control Framework', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p(`${company} has implemented a comprehensive IT control framework aligned with ISO/IEC 27001:2022. The framework is organized into thirteen control domains, each containing specific control objectives designed to address identified risks to the confidentiality, integrity, and availability of information assets.`),
      p(`As of ${periodEnd}, the control environment comprises ${controls.length} individual controls across ${ISO_DOMAINS.filter(d => controls.some(c => c.category === d)).length} active domains, with an overall completion rate of ${complianceScore}%.`),
      new Paragraph({ text: '6.2  Control Environment Components', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
    );

    const envRows2 = [
      ['Component', `Implementation at ${company}`],
      ['Control Environment', 'Tone at the top is set by the CISO and senior management. An information security policy is published and reviewed annually.'],
      ['Risk Assessment', `Formal risk assessments are conducted twice-yearly. ${risks.length} risks are currently tracked in the risk register.`],
      ['Control Activities', `${controls.length} controls span preventive, detective, and corrective categories across ${ISO_DOMAINS.length} domains.`],
      ['Information & Communication', 'Monthly security metrics are reported to management. Incidents are communicated to affected parties per defined procedures.'],
      ['Monitoring', 'ComplianceOS provides real-time dashboards. Controls are tested continuously; results are reviewed in monthly governance meetings.'],
      ['Remediation', `Action plans are required for all overdue controls. Currently ${overdue} control(s) are in overdue status and under remediation.`],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: envRows2.map((row, i) => new TableRow({
          children: [
            i === 0 ? hdrCell(row[0]) : dataCell(row[0], { bold: true }),
            i === 0 ? hdrCell(row[1]) : dataCell(row[1]),
          ],
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 300 } }),
      new Paragraph({ text: '6.3  Governance and Oversight', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p(`${company} maintains an Information Security Steering Committee that meets quarterly to review the status of the control environment, approve material changes to security policies, and review the risk register. The committee is chaired by the CISO and includes representatives from IT Operations, Legal, Compliance, and senior management.`),
      p('Internal compliance reviews are conducted semi-annually and findings are tracked in the compliance management system. All findings are assigned an owner, a remediation target date, and a severity rating. Unresolved critical findings are escalated to the Board of Directors.'),
    );

    // ── SECTION 7: RISK REGISTER ────────────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '7.  Risk Register', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      new Paragraph({ text: '7.1  Risk Management Methodology', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p(`${company} uses a structured risk management methodology based on ISO 31000 and ISO 27005. Risks are identified through periodic threat assessments, vulnerability scans, incident reviews, and internal audits. Each risk is evaluated using a likelihood × impact scoring matrix on a scale of 1–9, yielding a composite risk score that determines the risk rating and required response.`),
    );

    const riskMatrix = [
      ['Rating', 'Score Range', 'Required Response'],
      ['High', '7 – 9', 'Immediate action required. Risk owner and CISO must define mitigation plan within 30 days.'],
      ['Medium', '4 – 6', 'Action plan required within 90 days. Progress reviewed monthly by the Steering Committee.'],
      ['Low', '1 – 3', 'Accepted or monitored. Reviewed at the next scheduled risk assessment cycle.'],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: riskMatrix.map((row, i) => new TableRow({
          children: row.map((cell, j) => i === 0 ? hdrCell(cell) : dataCell(cell, {
            bold: j === 0,
            color: j === 0 ? (row[0] === 'High' ? 'dc2626' : row[0] === 'Medium' ? 'd97706' : '16a34a') : undefined,
          })),
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({ text: '7.2  Current Risk Register', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      new Paragraph({
        children: [
          new TextRun({ text: `Total risks: ${risks.length}  |  High (7–9): `, size: 20 }),
          new TextRun({ text: `${highRisks}`, bold: true, size: 20, color: 'dc2626' }),
          new TextRun({ text: `  |  Medium (4–6): `, size: 20 }),
          new TextRun({ text: `${medRisks}`, bold: true, size: 20, color: 'd97706' }),
          new TextRun({ text: `  |  Low (1–3): `, size: 20 }),
          new TextRun({ text: `${risks.length - highRisks - medRisks}`, bold: true, size: 20, color: '16a34a' }),
        ],
        spacing: { after: 200 },
      }),
    );

    if (risks.length > 0) {
      const riskHdr = ['Risk ID', 'Risk Title', 'Category', 'Score', 'Rating', 'Owner', 'Status'];
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: riskHdr.map(h => hdrCell(h)) }),
            ...risks.map(r => {
              const score = r.risk_score ?? 0;
              const rating = score >= 7 ? 'High' : score >= 4 ? 'Medium' : 'Low';
              const ratingColor = score >= 7 ? 'dc2626' : score >= 4 ? 'd97706' : '16a34a';
              return new TableRow({
                children: [
                  dataCell(r.id ?? '–', { mono: true }),
                  dataCell(r.title ?? '–'),
                  dataCell(r.category ?? '–'),
                  dataCell(String(score), { bold: true, color: ratingColor }),
                  dataCell(rating, { bold: true, color: ratingColor }),
                  dataCell(r.owner_name ?? '–'),
                  dataCell(r.status ?? '–'),
                ],
              });
            }),
          ],
        }),
        new Paragraph({ text: '', spacing: { after: 300 } }),
      );
    } else {
      children.push(p('No risks are currently registered in the system.'));
    }

    // ── SECTION 8: AUDITOR'S REPORT ─────────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    {
      const introBody = tplBody('sec_8_intro', `To: The Management of ${company} and its User Entities.\n\nWe have examined the description of ${company}'s General IT Controls and information security controls for the period ${periodStart} to ${periodEnd}.`);
      children.push(
        new Paragraph({ text: tplTitle('sec_8_intro', "8.  Independent Auditor's Assurance Report"), heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
        ...(introBody !== null ? bodyParagraphs(introBody) : []),
      );
    }
    children.push(
      new Paragraph({ text: '8.1  Auditor Responsibilities', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('Our responsibility is to express an opinion on the fairness of the presentation of the description and on the design and operating effectiveness of the controls to achieve the related control objectives, based on our examination. We conducted our engagement in accordance with the International Standard on Assurance Engagements (ISAE) 3402, "Assurance Reports on Controls at a Service Organization."'),
      p('That standard requires that we comply with ethical requirements and plan and perform our procedures to obtain reasonable assurance about whether, in all material respects, the description fairly presents the system as designed and implemented, the controls were suitably designed, and the controls operated effectively throughout the stated period.'),
      new Paragraph({ text: '8.2  Scope of Testing', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('Our procedures included examining evidence supporting the description and the design and operating effectiveness of the controls. Our tests of controls included inquiry, observation, inspection of documents and records, and re-performance of controls. We believe our examination provides a reasonable basis for our opinion.'),
      new Paragraph({ text: '8.3  Our Conclusion', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p(`Based on our examination, in our opinion, in all material respects, as at ${periodEnd}:`),
      p(`(i)   The description fairly presents ${company}'s system as designed and implemented throughout the period.`),
      p('(ii)  The controls related to the stated control objectives were suitably designed throughout the period.'),
      p(complianceScore >= 85
        ? `(iii) The controls tested operated effectively throughout the period ${periodStart} to ${periodEnd}, with no material exceptions noted.`
        : `(iii) The controls tested operated with ${overdue} exception(s) noted. Details and management responses are provided in Section 9.`),
      new Paragraph({ text: '8.4  Basis of Opinion', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p(`Our examination was conducted in accordance with the criteria established by ${company} management and set out in Section 6 of this report. We believe the criteria used are suitable and available to user entities and their auditors. Our independence and quality management policies have been applied throughout the engagement.`),
      new Paragraph({ text: '8.5  Legend', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('✓  No material deviations noted — controls operated effectively throughout the period'),
      p('⚠  Some weaknesses identified — improvements recommended; controls substantially effective'),
      p('✗  Critical weaknesses noted — controls not operating effectively; immediate remediation required'),
    );

    // ── SECTION 9: CONTROL OBJECTIVES TABLE ─────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '9.  Control Objectives, Security Measures, Tests and Findings', heading: HeadingLevel.HEADING_1, spacing: { after: 400 } }),
      p('The following sections present the control objectives for each ISO 27001 domain, together with the individual controls implemented, their test results, and auditor findings. Controls are tested using inquiry, observation, inspection of supporting evidence, and re-performance where applicable.'),
    );

    for (const domain of ISO_DOMAINS) {
      const domainControls = controls.filter(c => c.category === domain);
      if (domainControls.length === 0) continue;

      const symbol = getStatusSymbol(domainControls);
      const statusText = getStatusText(symbol);
      const completedInDomain = domainControls.filter(c => c.status === 'Completed').length;
      const overdueInDomain = domainControls.filter(c => c.status === 'Overdue').length;

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${domain}   `, bold: true, size: 26 }),
            new TextRun({ text: symbol, bold: true, size: 26, color: symbol === '✓' ? '16a34a' : symbol === '⚠' ? 'd97706' : 'dc2626' }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 150 },
        }),
        new Paragraph({ text: DOMAIN_DESCRIPTIONS[domain] || '', spacing: { after: 200 } }),
      );

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                hdrCell('Control ID'),
                hdrCell('Control Objective / Title'),
                hdrCell('Frequency'),
                hdrCell('Owner'),
                hdrCell('Status'),
                hdrCell('Result'),
              ],
            }),
            ...domainControls.map(ctrl => new TableRow({
              children: [
                dataCell(ctrl.id, { mono: true }),
                dataCell(ctrl.title),
                dataCell(ctrl.frequency || '–'),
                dataCell(ctrl.owner_name || '–'),
                dataCell(ctrl.status, { color: ctrl.status === 'Completed' ? '16a34a' : ctrl.status === 'Overdue' ? 'dc2626' : 'd97706' }),
                dataCell(ctrl.status === 'Completed' ? '✓' : ctrl.status === 'Overdue' ? '✗' : '⚠', {
                  bold: true,
                  color: ctrl.status === 'Completed' ? '16a34a' : ctrl.status === 'Overdue' ? 'dc2626' : 'd97706',
                }),
              ],
            })),
          ],
        }),
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Auditor Finding: ', bold: true, size: 20 }),
            new TextRun({
              text: `${completedInDomain} of ${domainControls.length} controls completed (${Math.round((completedInDomain / domainControls.length) * 100)}%). ${overdueInDomain > 0 ? `${overdueInDomain} control(s) overdue. ` : ''}${statusText}.`,
              size: 20,
              italics: true,
            }),
          ],
          spacing: { before: 150, after: 400 },
        }),
      );
    }

    // ── SECTION 10: CHANGE MANAGEMENT ───────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '10.  Change Management Controls', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      new Paragraph({ text: '10.1  Change Management Process', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('SIMTEQ AS operates a formal change management process aligned with ITIL best practices. All changes to production infrastructure, systems, and services must be submitted through the ITSM platform (ServiceNow) and are classified as Standard, Normal, or Emergency changes.'),
    );

    const changeRows = [
      ['Change Type', 'Authorization Required', 'Testing Required', 'Lead Time'],
      ['Standard', 'Pre-approved; documented procedure', 'Pre-validated procedure', 'Routine scheduling'],
      ['Normal', 'Change Advisory Board (CAB) approval', 'Full test plan required', 'Minimum 5 business days'],
      ['Emergency', 'CISO and CTO approval', 'Post-implementation review', 'Immediate; review within 48 hrs'],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: changeRows.map((row, i) => new TableRow({
          children: row.map((cell, j) => i === 0 ? hdrCell(cell) : dataCell(cell, { bold: j === 0 })),
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({ text: '10.2  Testing and Rollback', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('All Normal changes must include a documented test plan, a rollback procedure, and evidence of successful testing in a non-production environment before CAB approval is granted. Emergency changes undergo a formal post-implementation review within 48 hours of deployment to verify effectiveness and identify any unintended consequences.'),
      new Paragraph({ text: '10.3  Segregation of Duties in Change Process', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('No individual is permitted to both request and approve a change to production systems. The CAB includes representatives from Operations, Security, and at least one business stakeholder. Changes affecting security controls or cryptographic configurations require CISO sign-off in addition to standard CAB approval.'),
    );

    // ── SECTION 11: BUSINESS CONTINUITY & INCIDENT MANAGEMENT ───────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '11.  Business Continuity and Incident Management', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      new Paragraph({ text: '11.1  Business Continuity Planning', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('SIMTEQ AS maintains a Business Continuity Plan (BCP) and Disaster Recovery Plan (DRP) that are reviewed and tested annually. The plans define Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) for all critical services, as summarized below.'),
    );

    const bcpRows = [
      ['Service Category', 'RTO (Recovery Time)', 'RPO (Recovery Point)', 'Backup Frequency'],
      ['Core Infrastructure', '4 hours', '1 hour', 'Continuous replication'],
      ['Customer Data Services', '2 hours', '15 minutes', 'Continuous replication'],
      ['Service Desk / ITSM', '8 hours', '4 hours', 'Every 4 hours'],
      ['Administrative Systems', '24 hours', '24 hours', 'Daily'],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: bcpRows.map((row, i) => new TableRow({
          children: row.map((cell, j) => i === 0 ? hdrCell(cell) : dataCell(cell, { bold: j === 0 })),
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({ text: '11.2  Incident Management Process', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('Security incidents are managed through a formal Incident Response Plan (IRP) covering detection, triage, containment, eradication, recovery, and post-incident review phases. The Security Operations Center (SOC) operates 24/7 monitoring with defined escalation procedures. Critical incidents are escalated to the CISO within 30 minutes of detection.'),
      p('SIMTEQ AS maintains a Security Incident Register that records all incidents, their classification (P1–P4), root cause analysis, and remediation actions. Incidents affecting customer data are reported to affected user entities within 72 hours in accordance with GDPR and contractual requirements.'),
      new Paragraph({ text: '11.3  Testing and Exercises', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('Business continuity and disaster recovery capabilities are tested at least annually through tabletop exercises and live failover tests. Results are documented and used to update the BCP/DRP. The most recent full DR test was completed successfully within the reporting period.'),
    );

    // ── SECTION 12: ACCESS MANAGEMENT ───────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '12.  Access Management and Segregation of Duties', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      new Paragraph({ text: '12.1  Access Control Principles', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('SIMTEQ AS enforces the principles of least privilege and need-to-know for all access to systems and data. Access rights are granted based on job role and are documented in the Access Control Matrix. All access requests require formal approval from the system owner and the employee\'s line manager.'),
      new Paragraph({ text: '12.2  Identity and Authentication', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('All user accounts require multi-factor authentication (MFA) for access to production systems, cloud platforms, and the ITSM system. Privileged Access Management (PAM) is enforced for all administrative accounts through a dedicated PAM solution. Privileged sessions are logged and subject to periodic review.'),
    );

    const accessRows = [
      ['Access Category', 'Authentication Method', 'Review Frequency'],
      ['Standard User Accounts', 'Password + MFA (Authenticator App)', 'Quarterly'],
      ['Privileged / Admin Accounts', 'PAM + MFA + session recording', 'Monthly'],
      ['Service Accounts', 'Certificate-based or managed secrets', 'Semi-annually'],
      ['External / Partner Access', 'Federated identity + MFA', 'Upon contract renewal'],
      ['Emergency / Break-glass Accounts', 'PAM vault + dual approval', 'After each use'],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: accessRows.map((row, i) => new TableRow({
          children: row.map((cell, j) => i === 0 ? hdrCell(cell) : dataCell(cell, { bold: j === 0 })),
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      new Paragraph({ text: '12.3  Segregation of Duties', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('SIMTEQ AS enforces segregation of duties (SoD) across key IT processes. Roles with conflicting responsibilities — such as development and production deployment, or request and approval of access — are identified in the SoD matrix and are not permitted to be held by the same individual. Automated controls in the ITSM platform enforce this separation for change management and access request workflows.'),
      new Paragraph({ text: '12.4  Periodic Access Reviews', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
      p('All user access rights are reviewed quarterly by system owners. Privileged access is reviewed monthly. Any access rights that are no longer required are revoked within five business days of identification. Access is automatically disabled upon employee termination or role change as triggered by the HR system integration.'),
    );

    // ── SECTION 13: SUMMARY ─────────────────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '13.  Summary and Recommendations', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Overall Compliance Score: ', bold: true, size: 24 }),
          new TextRun({ text: `${complianceScore}%`, bold: true, size: 32, color: complianceScore >= 85 ? '16a34a' : complianceScore >= 70 ? 'd97706' : 'dc2626' }),
        ],
        spacing: { after: 300 },
      }),
    );

    const summaryRows = [
      ['Metric', 'Value', 'Assessment'],
      ['Total Controls', String(controls.length), 'Full scope assessed'],
      ['Controls Completed', String(completed), `${complianceScore}% completion rate`],
      ['Controls Overdue', String(overdue), overdue === 0 ? 'No overdue items' : 'Remediation required'],
      ['Total Risks', String(risks.length), 'All risks documented'],
      ['High Risks (7–9)', String(highRisks), highRisks === 0 ? 'No high risks' : 'Mitigation plans required'],
      ['Medium Risks (4–6)', String(medRisks), medRisks === 0 ? 'None' : 'Action plans in progress'],
      ['Active Domains', String(ISO_DOMAINS.filter(d => controls.some(c => c.category === d)).length), `of ${ISO_DOMAINS.length} total domains`],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: summaryRows.map((row, i) => new TableRow({
          children: row.map((cell, j) => i === 0 ? hdrCell(cell) : dataCell(cell, { bold: j === 0 })),
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 300 } }),
    );

    if (overdue > 0) {
      children.push(
        new Paragraph({ text: 'Overdue Controls Requiring Immediate Attention:', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
        ...controls.filter(c => c.status === 'Overdue').map(c =>
          new Paragraph({ text: `• ${c.id} – ${c.title} (Owner: ${c.owner_name || '–'})`, spacing: { after: 100 } })
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),
      );
    }

    if (highRisks > 0) {
      children.push(
        new Paragraph({ text: 'High-Priority Risks Requiring Mitigation:', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
        ...risks.filter(r => (r.risk_score ?? 0) >= 7).map(r =>
          new Paragraph({ text: `• ${r.id} – ${r.title} (Score: ${r.risk_score}, Owner: ${r.owner_name || '–'})`, spacing: { after: 100 } })
        ),
        new Paragraph({ text: '', spacing: { after: 200 } }),
      );
    }

    {
      const recsBody = tplBody('sec_13_recs', `1. ${overdue > 0 ? `Prioritize remediation of the ${overdue} overdue control(s) identified above. Assign dedicated owners and set target completion dates within 30 days.` : 'Maintain the current strong control completion rate and continue quarterly control reviews.'}\n\n2. ${highRisks > 0 ? `Develop and implement formal mitigation plans for the ${highRisks} high-priority risk(s) identified. Senior management should review progress monthly.` : 'Continue proactive risk identification and maintain the risk register with semi-annual formal reviews.'}\n\n3. Ensure all user entities have reviewed and implemented the Complementary User Entity Controls (CUECs) documented in Section 4 of this report.\n\n4. Continue annual testing of the Business Continuity and Disaster Recovery plans, incorporating lessons learned from the current reporting period.\n\n5. Review and update the Access Control Matrix following any organizational changes to ensure least-privilege principles are maintained.`);
      if (recsBody !== null) {
        children.push(
          new Paragraph({ text: tplTitle('sec_13_recs', 'Recommendations'), heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
          ...bodyParagraphs(recsBody),
        );
      }
    }

    if (customInstructions) {
      children.push(
        new Paragraph({ text: 'Additional Notes from Management', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
        p(customInstructions),
      );
    }

    // ── APPENDIX A: COMPLETE CONTROL LISTING ────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: 'Appendix A – Complete Control Listing', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      p(`This appendix provides a complete listing of all ${controls.length} controls in scope for this report, sorted by Control ID.`),
    );

    const sortedControls = [...controls].sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
    if (sortedControls.length > 0) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: ['ID', 'Title', 'Domain', 'Owner', 'Frequency', 'Status'].map(h => hdrCell(h)) }),
            ...sortedControls.map(ctrl => new TableRow({
              children: [
                dataCell(ctrl.id, { mono: true }),
                dataCell(ctrl.title),
                dataCell(ctrl.category || '–'),
                dataCell(ctrl.owner_name || '–'),
                dataCell(ctrl.frequency || '–'),
                dataCell(ctrl.status, {
                  color: ctrl.status === 'Completed' ? '16a34a' : ctrl.status === 'Overdue' ? 'dc2626' : 'd97706',
                }),
              ],
            })),
          ],
        }),
        new Paragraph({ text: '', spacing: { after: 300 } }),
      );
    }

    // ── APPENDIX B: GLOSSARY ─────────────────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: 'Appendix B – Glossary of Terms', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
    );

    const glossary = [
      ['Term', 'Definition'],
      ['ISAE 3402', 'International Standard on Assurance Engagements 3402, "Assurance Reports on Controls at a Service Organization." Issued by the International Auditing and Assurance Standards Board (IAASB).'],
      ['Type II Report', 'An ISAE 3402 report that covers both the design and operating effectiveness of controls over a defined period (typically 6–12 months).'],
      ['User Entity', 'An organization that uses the services of a service organization and whose financial reporting or operations may be affected by the service organization\'s controls.'],
      ['Control Objective', 'A statement of the desired result or purpose to be achieved by implementing control procedures in a particular activity.'],
      ['CUEC', 'Complementary User Entity Controls — controls that user entities must implement to complete the control environment and achieve the stated control objectives.'],
      ['SOC 2', 'Service Organization Control 2 — an auditing procedure ensuring a service organization securely manages data, equivalent to ISAE 3402 under US AICPA standards.'],
      ['RTO', 'Recovery Time Objective — the maximum acceptable time to restore a service or system after a disruption.'],
      ['RPO', 'Recovery Point Objective — the maximum acceptable data loss measured in time (e.g., maximum 1-hour data loss).'],
      ['MFA', 'Multi-Factor Authentication — a security mechanism requiring two or more verification factors to gain access to a system.'],
      ['PAM', 'Privileged Access Management — a security solution for managing, monitoring, and auditing privileged account access.'],
      ['CAB', 'Change Advisory Board — a group responsible for evaluating and authorizing changes to IT systems and infrastructure.'],
      ['SoD', 'Segregation of Duties — a control principle that prevents any single individual from controlling all phases of a transaction or process.'],
      ['CISO', 'Chief Information Security Officer — the senior executive responsible for an organization\'s information and data security strategy.'],
      ['SIEM', 'Security Information and Event Management — a system that collects and analyzes security data from across an organization\'s IT environment.'],
      ['ISO 27001', 'An international standard that specifies requirements for establishing, implementing, maintaining, and continually improving an information security management system (ISMS).'],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: glossary.map((row, i) => new TableRow({
          children: [
            i === 0 ? hdrCell(row[0]) : dataCell(row[0], { bold: true }),
            i === 0 ? hdrCell(row[1]) : dataCell(row[1]),
          ],
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 400 } }),
      new Paragraph({
        children: [new TextRun({ text: tplBody('footer', `This report was generated by ComplianceOS on behalf of ${company}. For official ISAE 3402 Type II certification, engage a qualified third-party auditor holding ISAE accreditation.`) ?? '', size: 18, color: '9ca3af', italics: true })],
        spacing: { before: 600 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'e5e7eb' } },
      }),
    );

    const doc = new Document({
      creator: `ComplianceOS – ${company}`,
      title: 'ISAE 3402 Type II Report',
      description: `ISAE 3402 compliance report for ${company} – ${periodStart} to ${periodEnd}`,
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company.replace(/\s+/g, '_')}_ISAE3402_${new Date().toISOString().split('T')[0]}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (!reportData) return;
    const { controls, risks } = reportData;
    const { periodStart, periodEnd, generated, company } = getReportMeta();

    const completed = controls.filter(c => c.status === 'Completed').length;
    const overdue = controls.filter(c => c.status === 'Overdue').length;
    const highRisks = risks.filter(r => r.risk_score >= 7).length;
    const complianceScore = controls.length > 0
      ? Math.round((completed / controls.length) * 100)
      : 0;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 0;

    const addPage = () => { doc.addPage(); y = 20; };

    const checkPage = (needed = 10) => {
      if (y + needed > 270) addPage();
    };

    const h1 = (text: string) => {
      checkPage(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text(text, margin, y);
      y += 8;
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentW, y);
      y += 5;
    };

    const h2 = (text: string) => {
      checkPage(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text(text, margin, y);
      y += 7;
    };

    const body = (text: string, indent = 0) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(text, contentW - indent);
      checkPage(lines.length * 4.5 + 2);
      doc.text(lines, margin + indent, y);
      y += lines.length * 4.5 + 2;
    };

    const tableRow = (cols: string[], colWidths: number[], isHeader = false) => {
      checkPage(8);
      const rowH = 7;
      let x = margin;
      if (isHeader) {
        doc.setFillColor(30, 64, 175);
        doc.rect(margin, y - 5, contentW, rowH, 'F');
      }
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
      doc.setFontSize(8);
      doc.setTextColor(isHeader ? 255 : 55, isHeader ? 255 : 65, isHeader ? 255 : 81);
      cols.forEach((col, i) => {
        const cell = doc.splitTextToSize(col, colWidths[i] - 2);
        doc.text(cell[0] ?? '', x + 1, y);
        x += colWidths[i];
      });
      y += rowH - 1;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(margin, y - 1, margin + contentW, y - 1);
    };

    // ── COVER ────────────────────────────────────────────────────────
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageW, 60, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(255, 255, 255);
    doc.text(company, pageW / 2, 28, { align: 'center' });
    doc.setFontSize(18);
    doc.text('ISAE 3402 TYPE II', pageW / 2, 44, { align: 'center' });

    y = 75;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(55, 65, 81);
    doc.text('Report on Controls at a Service Organization', pageW / 2, y, { align: 'center' });
    y += 12;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Reporting period: ${periodStart} – ${periodEnd}`, pageW / 2, y, { align: 'center' });
    y += 7;
    doc.text(`Generated: ${generated}`, pageW / 2, y, { align: 'center' });

    y = 140;
    const scoreColor: [number, number, number] = complianceScore >= 85 ? [22, 163, 74] : complianceScore >= 70 ? [217, 119, 6] : [220, 38, 38];
    doc.setFillColor(...scoreColor);
    doc.roundedRect(margin + 30, y, contentW - 60, 35, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text(`${complianceScore}%`, pageW / 2, y + 16, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Overall Compliance Score', pageW / 2, y + 27, { align: 'center' });

    y = 190;
    const kpis = [
      [`${controls.length}`, 'Total Controls'],
      [`${completed}`, 'Completed'],
      [`${overdue}`, 'Overdue'],
      [`${highRisks}`, 'High Risks'],
    ];
    const kpiW = contentW / 4;
    kpis.forEach((kpi, i) => {
      const kx = margin + i * kpiW + kpiW / 2;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin + i * kpiW + 2, y - 5, kpiW - 4, 22, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text(kpi[0], kx, y + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(kpi[1], kx, y + 14, { align: 'center' });
    });

    y = 225;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text('CONFIDENTIAL – FOR AUTHORIZED USE ONLY', pageW / 2, y, { align: 'center' });

    // ── P2: MANAGEMENT STATEMENT ────────────────────────────────────
    addPage();
    h1('1.  Management Statement');
    h2('1a.  Statement by SIMTEQ Management');
    body(`${company} management confirms that this report accurately describes the company's general IT controls for the period ${periodStart} to ${periodEnd}. The description covers the control objectives established by management, the actual controls implemented, and the conditions under which these controls operate.`);
    body('Management is responsible for designing, implementing, and maintaining effective controls. This report has been prepared to provide relevant information to user entities and their auditors.');
    y += 4;
    h2('1b.  Management Assertion');
    body('Management asserts that:');
    body('• The description fairly presents the system as designed and implemented throughout the specified period.', 4);
    body('• The controls related to the stated control objectives were suitably designed throughout the specified period.', 4);
    body('• The controls operated effectively throughout the period to provide reasonable assurance that control objectives were achieved.', 4);

    // ── P3: CONTROL ENVIRONMENT ──────────────────────────────────────
    y += 6;
    h1('2.  Description of the IT Control Environment');
    h2('2a.  Overview of Services');
    body(`${company} is a Norwegian IT services company providing managed services, cloud solutions, and IT infrastructure support. The company processes and stores customer data on behalf of its clients, making robust internal controls essential for maintaining trust and compliance.`);
    y += 4;
    h2('2b.  Control Environment Summary');
    const envCols = ['Component', 'Details'];
    const envColW = [50, contentW - 50];
    tableRow(envCols, envColW, true);
    [
      ['Governance', 'Management information security framework aligned with ISO 27001:2022'],
      ['Risk Management', `${risks.length} identified risks with structured risk register and regular reviews`],
      ['Control Activities', `${controls.length} controls across ${ISO_DOMAINS.filter(d => controls.some(c => c.category === d)).length} domains`],
      ['Monitoring', 'Continuous monitoring via ComplianceOS with automated status tracking'],
    ].forEach(row => tableRow(row, envColW));

    // ── P4: AUDITOR'S REPORT ─────────────────────────────────────────
    y += 8;
    checkPage(60);
    h1("3.  Independent Auditor's Assurance Report");
    body(`To: ${company} and its User Entities`);
    y += 2;
    body(`We have examined the description of ${company}'s General IT Controls and have performed tests of controls necessary to form an opinion on the design and operating effectiveness of those controls.`);
    y += 4;
    h2('Legend');
    body('✓  No material deviations noted during the period');
    body('⚠  Some weaknesses identified — improvements recommended');
    body('✗  Critical weaknesses noted — immediate remediation required');

    // ── P5+: CONTROL OBJECTIVES TABLE ────────────────────────────────
    addPage();
    h1('4.  Control Objectives, Security Measures, Tests and Findings');

    const ctrlCols = ['ID', 'Control Objective', 'Freq.', 'Status', 'Result'];
    const ctrlColW = [14, contentW - 14 - 20 - 22 - 16, 20, 22, 16];

    for (const domain of ISO_DOMAINS) {
      const domainControls = controls.filter(c => c.category === domain);
      if (domainControls.length === 0) continue;

      const symbol = getStatusSymbol(domainControls);
      const completedInDomain = domainControls.filter(c => c.status === 'Completed').length;

      checkPage(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const symbolColor: [number, number, number] = symbol === '✓' ? [22, 163, 74] : symbol === '⚠' ? [217, 119, 6] : [220, 38, 38];
      doc.setTextColor(31, 41, 55);
      doc.text(domain, margin, y);
      doc.setTextColor(...symbolColor);
      doc.text(`  ${symbol}`, margin + doc.getTextWidth(domain), y);
      y += 6;

      tableRow(ctrlCols, ctrlColW, true);
      domainControls.forEach(ctrl => {
        const result = ctrl.status === 'Completed' ? '✓' : ctrl.status === 'Overdue' ? '✗' : '⚠';
        tableRow([ctrl.id, ctrl.title, ctrl.frequency || '–', ctrl.status, result], ctrlColW);
      });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      checkPage(6);
      doc.text(`Finding: ${completedInDomain}/${domainControls.length} controls completed. ${getStatusText(symbol)}.`, margin, y + 2);
      y += 8;
    }

    // ── SUMMARY ──────────────────────────────────────────────────────
    checkPage(50);
    h1('5.  Summary and Recommendations');
    body(`Overall compliance score: ${complianceScore}%  |  Controls: ${controls.length} total, ${completed} completed, ${overdue} overdue`);
    body(`Risks: ${risks.length} total, ${highRisks} high-priority (score ≥ 7)`);

    if (overdue > 0) {
      y += 3;
      h2('Overdue Controls Requiring Immediate Attention');
      controls.filter(c => c.status === 'Overdue').forEach(c => {
        body(`• ${c.id} – ${c.title}  (Owner: ${c.owner_name || '–'})`, 4);
      });
    }

    if (customInstructions) {
      y += 3;
      h2('Additional Notes');
      body(customInstructions);
    }

    // ── FOOTER ────────────────────────────────────────────────────────
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `${company} – ISAE 3402 Type II – ${periodStart} to ${periodEnd}  |  Page ${i} of ${pageCount}`,
        pageW / 2,
        290,
        { align: 'center' }
      );
    }

    doc.save(`${company.replace(/\s+/g, '_')}_ISAE3402_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleReset = () => {
    setReportGenerated(false);
    setGenerationProgress(0);
    setReportData(null);
    setCustomInstructions('');
  };

  const controls = reportData?.controls || [];
  const risks = reportData?.risks || [];
  const completed = controls.filter(c => c.status === 'Completed').length;
  const overdue = controls.filter(c => c.status === 'Overdue').length;
  const highRisks = risks.filter(r => r.risk_score >= 7).length;
  const complianceScore = controls.length > 0
    ? Math.round((completed / controls.length) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 shrink-0 pr-12">
          <div className="w-9 h-9 bg-slate-900 rounded flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-sm font-semibold text-slate-900 leading-none">ISAE 3402 Report Generator</DialogTitle>
            <p className="text-xs text-slate-400 mt-1">{template?.company_name ?? 'SIMTEQ AS'} · Type II · {template ? `${template.period_start} – ${template.period_end}` : 'Reporting period'}</p>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* PRE-GENERATION */}
          {!isGenerating && !reportGenerated && (
            <div className="grid grid-cols-[1fr_280px] divide-x divide-slate-200 min-h-[520px]">

              {/* Left: overview */}
              <div className="p-6 space-y-5">
                {/* Info strip */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: <Shield className="w-3.5 h-3.5" />, label: 'Sections', value: '13+', sub: 'incl. appendices' },
                    { icon: <FileText className="w-3.5 h-3.5" />, label: 'Domains', value: String(ISO_DOMAINS.length), sub: 'ISO 27001' },
                    { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Data source', value: 'Live', sub: 'Supabase DB' },
                    { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Period', value: '2025', sub: 'Jan – Dec' },
                  ].map(item => (
                    <div key={item.label} className="border border-slate-200 rounded p-3">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-2">{item.icon}<span className="text-[10px] font-medium uppercase tracking-wide">{item.label}</span></div>
                      <p className="text-xl font-semibold text-slate-900 leading-none">{item.value}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{item.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Report sections */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Report Sections (Sentia Template)</p>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                    {[
                      '1. Scope, Objective & Applicability',
                      '2. System Description',
                      '3. Management Statement',
                      '4. Complementary User Entity Controls',
                      '5. Sub-service Organizations',
                      '6. IT Control Environment',
                      '7. Risk Register',
                      "8. Independent Auditor's Report",
                      '9. Control Objectives & Test Results',
                      '10. Change Management Controls',
                      '11. Business Continuity & Incident Mgmt',
                      '12. Access Management & SoD',
                      '13. Summary & Recommendations',
                      'Appendix A: Complete Control Listing',
                      'Appendix B: Glossary of Terms',
                      'Cover page + Table of Contents',
                    ].map((section, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                        <span>{section}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: config + notes */}
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Configuration</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Reporting period', value: 'Jan – Dec 2025' },
                      { label: 'Standard', value: 'ISAE 3402 Type II' },
                      { label: 'Format', value: 'DOCX + PDF' },
                      { label: 'Language', value: 'English' },
                      { label: 'Data source', value: 'Live (Supabase)' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="text-slate-400">{row.label}</span>
                        <span className="font-medium text-slate-800">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2">
                  <Label htmlFor="instructions" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Additional Notes <span className="normal-case font-normal text-slate-300">(optional)</span>
                  </Label>
                  <Textarea
                    id="instructions"
                    placeholder="Specific focus areas or additional context for the report…"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="flex-1 resize-none min-h-[120px] text-xs"
                  />
                </div>

                <Button onClick={handleGenerateReport} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-9 text-sm">
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  Generate Report
                </Button>
              </div>
            </div>
          )}

          {/* GENERATING */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Fetching Live Data</h3>
              <p className="text-xs text-slate-400 mb-8 text-center">Loading controls, risks, and compliance data from Supabase…</p>
              <div className="w-full max-w-xs">
                <Progress value={generationProgress} className="h-1.5 mb-2" />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Progress</span>
                  <span>{generationProgress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* POST-GENERATION */}
          {reportGenerated && reportData && (
            <div className="flex flex-col">
              {/* Status banner */}
              <div className="flex items-center justify-between px-6 py-3 bg-green-50 border-b border-green-200 shrink-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Report Data Ready</span>
                  <span className="text-xs text-green-600">{controls.length} controls · {risks.length} risks</span>
                </div>
                <Badge variant="outline" className="bg-white text-green-700 border-green-200 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              </div>

              {/* Two-column content */}
              <div className="grid grid-cols-[1fr_268px] divide-x divide-slate-200">

                {/* Left: metrics + domain table */}
                <div className="p-6 space-y-5">
                  {/* 4 metrics */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Compliance Score', value: `${complianceScore}%`, color: complianceScore >= 85 ? 'text-green-700' : complianceScore >= 70 ? 'text-amber-600' : 'text-red-600' },
                      { label: 'Completed', value: String(completed), color: 'text-slate-900' },
                      { label: 'Overdue', value: String(overdue), color: overdue > 0 ? 'text-red-600' : 'text-slate-900' },
                      { label: 'High Risks', value: String(highRisks), color: highRisks > 0 ? 'text-amber-600' : 'text-slate-900' },
                    ].map(m => (
                      <div key={m.label} className="border border-slate-200 rounded p-3 text-center">
                        <p className={`text-2xl font-bold leading-none ${m.color}`}>{m.value}</p>
                        <p className="text-[11px] text-slate-400 mt-1.5">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Domain table */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Control Status by ISO 27001 Domain</p>
                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-3 py-2 font-medium text-slate-500">Domain</th>
                            <th className="text-right px-3 py-2 font-medium text-slate-500 w-20">Controls</th>
                            <th className="text-center px-3 py-2 font-medium text-slate-500 w-16">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ISO_DOMAINS.map(domain => {
                            const dc = controls.filter(c => c.category === domain);
                            if (dc.length === 0) return null;
                            const symbol = getStatusSymbol(dc);
                            const comp = dc.filter(c => c.status === 'Completed').length;
                            return (
                              <tr key={domain} className="hover:bg-slate-50/50">
                                <td className="px-3 py-1.5 text-slate-700">{domain}</td>
                                <td className="px-3 py-1.5 text-right text-slate-400">{comp}/{dc.length}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <span className={`font-bold text-sm ${symbol === '✓' ? 'text-green-600' : symbol === '⚠' ? 'text-amber-500' : 'text-red-600'}`}>{symbol}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right: export options */}
                <div className="p-6 flex flex-col gap-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Export</p>

                  <button
                    onClick={handleDownloadWord}
                    className="flex items-start gap-3 p-3.5 border border-slate-200 rounded hover:border-slate-400 hover:bg-slate-50 transition-colors text-left w-full group"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Word (.docx)</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Fully formatted with tables, heading styles, and company branding</p>
                    </div>
                  </button>

                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-start gap-3 p-3.5 border border-slate-200 rounded hover:border-slate-400 hover:bg-slate-50 transition-colors text-left w-full group"
                  >
                    <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center shrink-0 mt-0.5">
                      <Download className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">PDF</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Print-ready A4, suitable for distribution to auditors</p>
                    </div>
                  </button>

                  <div className="mt-auto">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Report includes</div>
                    <div className="space-y-1">
                      {['Cover page + Table of Contents', '13 compliance sections', 'Full control test results', 'Risk register snapshot', 'Appendices A & B'].map(item => (
                        <div key={item} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <CheckCircle2 className="w-3 h-3 text-slate-300 shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 leading-relaxed">
                    For official ISAE 3402 Type II certification, engage a qualified third-party auditor.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 shrink-0">
          <div>
            {reportGenerated && (
              <Button variant="outline" size="sm" onClick={handleReset} className="h-7 text-xs px-3">
                New Report
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-7 text-xs px-3">
            Close
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
