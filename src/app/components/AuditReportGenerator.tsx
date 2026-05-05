import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
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

const SIMTEQ_WEBSITE = 'https://simteq.com/';
const SIMTEQ_SERVICE_SCOPE =
  'This report covers the general IT controls and information security controls operated by {{company}} in connection with its accounting automation platform and related advisory services. Publicly described services include 2CLICK by SIMTEQ, 2CLICK for Hospitality, ERP implementation, financial advisory and reporting, ERP/bank/PMS integrations, invoice recognition, bank clearing, expense management, and secure payment automation.';
const SIMTEQ_COMPANY_OVERVIEW =
  `{{company}} is a Danish accounting automation and financial technology company. Its public website describes SIMTEQ as providing automation that empowers accounting, including the 2CLICK platform for bookkeeping and financial management and 2CLICK for Hospitality for hotel and hospitality finance workflows. Website: ${SIMTEQ_WEBSITE}.`;

function getDomainResult(controls: Control[]): string {
  if (controls.length === 0) return 'Not scoped';
  const overdue = controls.filter(c => c.status === 'Overdue').length;
  const pending = controls.filter(c => c.status === 'Pending').length;
  if (overdue > 0) return 'Exception';
  if (pending > controls.length * 0.3) return 'Review needed';
  return 'Effective';
}

function getControlResult(status: string): string {
  if (status === 'Completed') return 'Effective';
  if (status === 'Overdue') return 'Exception';
  return 'Review needed';
}

function getResultColor(result: string): string {
  if (result === 'Effective') return '16a34a';
  if (result === 'Exception') return 'dc2626';
  if (result === 'Review needed') return 'd97706';
  return '6b7280';
}

function getResultRgb(result: string): [number, number, number] {
  if (result === 'Effective') return [22, 163, 74];
  if (result === 'Exception') return [220, 38, 38];
  if (result === 'Review needed') return [217, 119, 6];
  return [107, 114, 128];
}

function getStatusText(result: string): string {
  if (result === 'Effective') return 'No material deviations noted';
  if (result === 'Review needed') return 'Minor weaknesses identified - improvements recommended';
  if (result === 'Exception') return 'Critical weaknesses - immediate remediation required';
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
    if (!s) return substitute(normalizeTemplateBody(key, fallback));
    if (!s.visible) return null;
    // If the user explicitly saved content, trust it as-is — skip normalization.
    if (s.body) return substitute(s.body);
    return substitute(normalizeTemplateBody(key, fallback));
  };

  const tplTitle = (key: string, fallback: string): string => {
    const s = sectionMap[key];
    if (!s || !s.visible) return substitute(fallback);
    return substitute(s.title || fallback);
  };

  const normalizeTemplateBody = (key: string, body: string): string => {
    const company = getReportMeta().company.toLowerCase();
    if (!company.includes('simteq')) return body;

    const staleServiceText = /(managed services|cloud services|cloud solutions|it infrastructure|service desk|security operations|data center|headquartered in norway|norwegian it services)/i;
    if (key === 'sec_1_2' && staleServiceText.test(body)) return SIMTEQ_SERVICE_SCOPE;
    if (key === 'sec_2_1' && staleServiceText.test(body)) return SIMTEQ_COMPANY_OVERVIEW;
    return body;
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
      ['13.', 'Data Privacy and GDPR Compliance'],
      ['14.', 'Vulnerability Management and Penetration Testing'],
      ['15.', 'Summary and Recommendations'],
      ['Appendix A.', 'Complete Control Listing'],
      ['Appendix B.', 'Glossary of Terms'],
      ['Appendix C.', 'Audit Evidence and Testing Approach'],
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
        company.toLowerCase().includes('simteq')
          ? SIMTEQ_SERVICE_SCOPE
          : `This report covers the general IT controls and information security controls operated by ${company} in connection with the services provided to user entities.`),
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
        company.toLowerCase().includes('simteq')
          ? SIMTEQ_COMPANY_OVERVIEW
          : `${company} operates services for user entities supported by documented general IT controls and information security controls.`),
      ...tplSubsection('sec_2_2', '2.2  Infrastructure and Technology Components',
        `The ${company} control environment comprises the following key components:`),
    );

    const infraRows = company.toLowerCase().includes('simteq') ? [
      ['Component', 'Description', 'Technology'],
      ['2CLICK Platform', 'Accounting automation platform for bookkeeping and financial management workflows', 'Application platform and integrations'],
      ['Hospitality Workflows', 'Financial workflow automation for hotel and hospitality customers', '2CLICK for Hospitality'],
      ['Integrations', 'Connections supporting ERP, bank, PMS, invoice recognition, and payment workflows', 'ERP, banking, PMS, and payment integrations'],
      ['Identity and Access', 'User access, authentication, and authorization controls for in-scope systems', 'Access management controls'],
      ['Monitoring and Operations', 'Operational monitoring, support, and control follow-up for the in-scope platform', 'Operational procedures and logs'],
    ] : [
      ['Component', 'Description', 'Technology'],
      ['Platform', 'Systems and applications used to deliver services to user entities', 'Application and infrastructure platform'],
      ['Network', 'Network services with segmentation and perimeter controls', 'Network security controls'],
      ['Storage', 'Data storage, retention, backup, and recovery controls', 'Storage and backup services'],
      ['Identity', 'Identity and access management for in-scope systems', 'Access management controls'],
      ['Monitoring', 'Operational and security monitoring with defined escalation procedures', 'Monitoring tools and logs'],
      ['Change Management', 'Documented change request, approval, testing, and release procedures', 'Change management workflow'],
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
        `Customer data is received by ${company} through encrypted channels (TLS 1.2 or higher) and processed within isolated tenant environments. The following data lifecycle applies to in-scope services:\n\n• Ingestion: Customer data is submitted via authenticated API endpoints or secure file transfer. All transmissions are encrypted in transit. Inbound data is authenticated and authorised before acceptance.\n• Validation and Processing: Received data is validated for format integrity and completeness prior to processing. Automated workflow engines apply business logic and transformations within compute resources isolated per tenant.\n• Storage: Processed data and documents are stored in encrypted data stores. Encryption at rest uses AES-256 or equivalent. Logical separation is enforced at the data and access layer; no cross-tenant data access is permitted.\n• Output and Delivery: Results (reports, notifications, exports) are delivered to authorised recipients via authenticated, encrypted channels. Delivery confirmations are logged.\n• Retention and Disposal: Customer data is retained in accordance with contractual terms and applicable legal requirements (including GDPR). At end-of-retention, data is securely deleted or anonymised using documented disposal procedures, and disposal is recorded.`),
      ...tplSubsection('sec_2_4', '2.4  Personnel and Organizational Structure',
        `${company} maintains a dedicated Information Security function. The CISO reports directly to senior management and chairs the Information Security Steering Committee. Key security roles include Information Security Manager, IT Operations Lead, Compliance Officer, Data Protection Officer (DPO), and a dedicated Security Operations function.\n\nAll personnel with access to in-scope systems undergo background checks prior to employment and sign confidentiality agreements. Role-specific security awareness training is completed during onboarding and repeated annually. Upon role change or departure, access rights are revoked within one business day as triggered by the HR system integration.`),
      ...tplSubsection('sec_2_5', '2.5  Principal Service Commitments and System Requirements',
        `${company} has established the following principal service commitments applicable to the in-scope services. These commitments form the basis for the control objectives described in this report and are monitored on a continuous basis through the compliance management system.`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Commitment Area', 'Commitment Statement', 'Applicable Control Domains'].map(h => hdrCell(h)) }),
          ...[
            ['Availability', `${company} is committed to maintaining agreed service availability levels for in-scope systems in accordance with contractual SLAs, business continuity plans, and incident response procedures.`, 'Kontinuitet, Drift, Sikkerhetshendelser'],
            ['Confidentiality', 'Customer data is protected from unauthorized disclosure through access controls, encryption, and documented data handling procedures.', 'Tilgangskontroll, Datasikkerhet, Personal'],
            ['Integrity', 'Data processed by in-scope systems is protected from unauthorised modification through input validation, change management, audit logging, and monitoring controls.', 'Drift, Teknologi, Organisatoriske foranstaltninger'],
            ['Security', 'In-scope systems are protected from unauthorised access and threats through layered security controls aligned with ISO/IEC 27001:2022 across all thirteen control domains.', 'All ISO 27001 domains'],
            ['Privacy', 'Personal data is processed lawfully, fairly, and transparently in accordance with GDPR and applicable data protection legislation. Data subjects\' rights are supported through documented procedures.', 'Etterlevelse, Datasikkerhet'],
            ['Processing Integrity', 'System processing is complete, valid, accurate, timely, and authorised, with controls in place to detect and correct processing errors.', 'Applikasjonssikkerhet, Drift, Teknologi'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 300 } }),
    );

    // ── SECTION 3: MANAGEMENT STATEMENT ────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '3.  Management Statement and Assertion', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_3_1', `3.1  Statement by ${company} Management`,
        `${company} management confirms that this report accurately describes the company's general IT controls and information security controls for the period ${periodStart} to ${periodEnd}.`),
      ...tplSubsection('sec_3_2', '3.2  Management Assertion',
        `Based on the criteria established in the ISAE 3402 standard, ${company} management asserts that:\n\n(i)   The description of the system fairly presents ${company}'s system as designed and implemented throughout the period from ${periodStart} to ${periodEnd}.\n\n(ii)  The controls related to the stated control objectives were suitably designed throughout the specified period to provide reasonable assurance that those objectives would be achieved if the controls operated effectively.\n\n(iii) The controls tested operated effectively throughout the specified period to provide reasonable assurance that the related control objectives were achieved.\n\n(iv)  ${company} has implemented complementary sub-service organization controls where applicable, and relies on the controls of sub-service organizations for certain objectives as described in Section 5.`),
      ...tplSubsection('sec_3_3', '3.3  Responsibility Statement',
        `Management of ${company} acknowledges its responsibility for monitoring the ongoing performance of controls.`),
    );

    // ── SECTION 4: CUEC ─────────────────────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '4.  Complementary User Entity Controls (CUEC)', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_4_1', '4.1  Overview',
        `The controls described in this report are designed with the assumption that user entities have implemented certain complementary controls. ${company}'s controls alone are not sufficient to achieve all control objectives.`),
      ...tplSubsection('sec_4_2', '4.2  Required Complementary User Entity Controls', ''),
    );

    const cuecRows = [
      ['Control Area', 'Required User Entity Control'],
      ['User Access', `User entities are responsible for provisioning and revoking access rights for their own employees to the services provided by ${company} in a timely manner.`],
      ['Data Classification', `User entities are responsible for classifying their own data appropriately and communicating data handling requirements to ${company} prior to processing.`],
      ['Incident Reporting', `User entities are responsible for promptly reporting suspected security incidents, unauthorized access, or unusual system behavior to ${company} through the agreed support or security contact channel.`],
      ['Change Requests', `User entities must formally authorize and document all change requests submitted to ${company} through the defined change management process.`],
      ['Backup Verification', 'User entities are responsible for periodically verifying the recoverability of their own backups by requesting restore tests in accordance with agreed service levels.'],
      ['Audit Cooperation', `User entities must cooperate with ${company} during security reviews or audits that may affect the security of the shared environment.`],
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

    const subRows = company.toLowerCase().includes('simteq') ? [
      ['Sub-service Organization', 'Services Provided', 'Applicable Criteria'],
      ['ERP, bank, PMS, and payment providers', 'Integration endpoints used for accounting automation and secure payment workflows', 'Vendor assurance and contractual security terms to be reviewed'],
      ['Hosting and application platform providers', 'Platform hosting, storage, availability, and operational support for in-scope services', 'Supplier assurance reports and security commitments to be reviewed'],
      ['Invoice, expense, and reporting service providers', 'Supporting services for invoice recognition, expense management, and financial reporting workflows', 'Vendor risk assessment and data processing terms to be reviewed'],
    ] : [
      ['Sub-service Organization', 'Services Provided', 'Applicable Criteria'],
      ['Primary hosting provider', 'Application hosting, storage, and availability services', 'Supplier assurance reports to be reviewed'],
      ['Identity provider', 'Authentication, authorization, and user lifecycle support', 'Supplier assurance reports to be reviewed'],
      ['Backup or recovery provider', 'Backup storage and recovery support', 'Supplier assurance reports to be reviewed'],
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: subRows.map((row, i) => new TableRow({
          children: row.map((cell, j) => i === 0 ? hdrCell(cell) : dataCell(cell, { bold: j === 0 })),
        })),
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...(() => { const b = tplBody('sec_5_trail', `${company} performs periodic due diligence reviews of sub-service organizations. Contracts with sub-service organizations should include appropriate security requirements, data processing agreements, and audit or assurance provisions where relevant.`); return b !== null ? bodyParagraphs(b) : []; })(),
    );

    // ── SECTION 6: CONTROL ENVIRONMENT ─────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '6.  Description of the IT Control Environment', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_6_1', '6.1  Control Framework',
        `${company} has implemented a comprehensive IT control framework aligned with ISO/IEC 27001:2022. The framework is organized into thirteen control domains, each containing specific control objectives designed to address identified risks to the confidentiality, integrity, and availability of information assets.`),
      p(`As of ${periodEnd}, the control environment comprises ${controls.length} individual controls across ${ISO_DOMAINS.filter(d => controls.some(c => c.category === d)).length} active domains, with an overall completion rate of ${complianceScore}%.`),
      ...tplSubsection('sec_6_2', '6.2  Control Environment Components', ''),
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
      ...tplSubsection('sec_6_3', '6.3  Governance and Oversight',
        `${company} maintains an Information Security Steering Committee that meets quarterly to review the status of the control environment, approve material changes to security policies, and review the risk register. The committee is chaired by the CISO and includes representatives from IT Operations, Legal, Compliance, and senior management.\n\nInternal compliance reviews are conducted semi-annually and findings are tracked in the compliance management system. All findings are assigned an owner, a remediation target date, and a severity rating. Unresolved critical findings are escalated to the Board of Directors.`),
      ...tplSubsection('sec_6_4', '6.4  Security Policy Framework',
        `${company} maintains a comprehensive information security policy framework. All policies are approved by senior management, communicated to relevant personnel, and reviewed at least annually or following significant changes. The policy framework comprises the following key documents:`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Policy Document', 'Scope', 'Review Frequency', 'Owner'].map(h => hdrCell(h)) }),
          ...[
            ['Information Security Policy', 'All systems, data, and personnel', 'Annual', 'CISO'],
            ['Acceptable Use Policy', 'All employees and contractors', 'Annual', 'HR / CISO'],
            ['Access Control Policy', 'All in-scope production systems', 'Annual', 'IT Operations'],
            ['Data Classification Policy', 'All data assets', 'Annual', 'CISO / DPO'],
            ['Incident Response Plan', 'All security events and breaches', 'Annual + post-incident review', 'CISO'],
            ['Business Continuity Policy', 'Critical services and infrastructure', 'Annual + after DR test', 'Operations Lead'],
            ['Change Management Policy', 'All production system changes', 'Annual', 'IT Operations'],
            ['Supplier and Third-Party Security Policy', 'All vendor and partner relationships', 'Annual', 'CISO'],
            ['Data Retention and Disposal Policy', 'All data assets', 'Annual', 'DPO / Legal'],
            ['Cryptography and Key Management Policy', 'All cryptographic systems and keys', 'Annual', 'IT Operations / CISO'],
            ['Vulnerability Management Policy', 'All in-scope systems', 'Annual', 'IT Operations / CISO'],
            ['Physical Security Policy', 'Facilities and physical access', 'Annual', 'Operations Lead'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...tplSubsection('sec_6_5', '6.5  Security Awareness and Training Program',
        `${company} operates a structured security awareness and training program to ensure all personnel understand their information security responsibilities and are equipped to recognise and respond to current threats. Training completion is tracked centrally and reported to the CISO quarterly.`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Training Activity', 'Target Audience', 'Frequency', 'Format', 'Completion Tracking'].map(h => hdrCell(h)) }),
          ...[
            ['Information Security Awareness', 'All employees', 'Annual (mandatory)', 'E-learning + assessment', 'LMS — 100% completion required'],
            ['Phishing Simulation Campaign', 'All employees', 'Quarterly', 'Simulated phishing e-mail', 'Click rate and reporting rate tracked'],
            ['GDPR and Data Privacy', 'All staff handling personal data', 'Annual (mandatory)', 'E-learning', 'LMS — 100% completion required'],
            ['Secure Development (OWASP)', 'Development team', 'Annual', 'Workshop', 'Attendance record'],
            ['Incident Response Tabletop', 'IT and Security team', 'Semi-annual', 'Facilitated exercise', 'Exercise report'],
            ['Social Engineering Awareness', 'All employees', 'Annual', 'Interactive module', 'LMS score'],
            ['Security Onboarding Briefing', 'New hires', 'On-boarding', 'In-person / video', 'HR completion record'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      ...(() => { const b = tplBody('sec_6_5_trail', `Non-completion of mandatory training within the defined window is escalated to the relevant line manager. Persistent non-completion is treated as a disciplinary matter in accordance with the company's Human Resources policy.`); return b !== null ? bodyParagraphs(b) : []; })(),
    );

    // ── SECTION 7: RISK REGISTER ────────────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '7.  Risk Register', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_7_1', '7.1  Risk Management Methodology',
        `${company} uses a structured risk management methodology based on ISO 31000 and ISO 27005. Risks are identified through periodic threat assessments, vulnerability scans, incident reviews, and internal audits. Each risk is evaluated using a likelihood × impact scoring matrix on a scale of 1–9, yielding a composite risk score that determines the risk rating and required response.`),
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

    children.push(
      ...tplSubsection('sec_7_3', '7.3  Risk Treatment Plan Summary',
        `For each identified risk, ${company} selects and implements one of the following treatment options in accordance with its risk appetite and the requirements of ISO 31000. Treatment decisions are approved by the CISO and reviewed by the Information Security Steering Committee.`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Treatment Option', 'Definition', 'Applicable When', 'Examples in Scope'].map(h => hdrCell(h)) }),
          ...[
            ['Mitigate (Reduce)', 'Implement controls to reduce the likelihood or impact of the risk to an acceptable level.', 'Risk score exceeds appetite and cost-effective controls exist.', 'Access controls, encryption, monitoring, vulnerability patching'],
            ['Transfer (Share)', 'Transfer financial or operational consequence to a third party (e.g. insurance, contract).', 'Residual risk is acceptable but loss exposure is significant.', 'Cyber insurance, contractual liability clauses, SLAs'],
            ['Avoid (Terminate)', 'Cease the activity that creates the risk.', 'Risk cannot be reduced to an acceptable level and the activity is non-essential.', 'Discontinuing an unsafe integration or unsupported system'],
            ['Accept (Retain)', 'Consciously accept the risk without additional treatment.', 'Risk is within appetite or cost of treatment exceeds potential loss.', 'Low-scored residual risks formally accepted and documented by CISO'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...(() => { const b = tplBody('sec_7_3_trail', `Residual risk (the risk remaining after treatment) is documented for each risk and reviewed at least semi-annually. All risks with a residual score above the defined risk appetite threshold (score ≥ 7) require formal written acceptance by the CISO and a time-bound mitigation plan. No high-scoring residual risks may remain untreated for more than 90 days without Board-level escalation.`); return b !== null ? bodyParagraphs(b) : []; })(),
      new Paragraph({ text: '', spacing: { after: 300 } }),
    );

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
      ...tplSubsection('sec_8_1', '8.1  Auditor Responsibilities',
        `Our responsibility is to express an opinion on the fairness of the presentation of the description and on the design and operating effectiveness of the controls to achieve the related control objectives, based on our examination. We conducted our engagement in accordance with the International Standard on Assurance Engagements (ISAE) 3402, "Assurance Reports on Controls at a Service Organization."\n\nThat standard requires that we comply with ethical requirements and plan and perform our procedures to obtain reasonable assurance about whether, in all material respects, the description fairly presents the system as designed and implemented, the controls were suitably designed, and the controls operated effectively throughout the stated period.`),
      ...tplSubsection('sec_8_2', '8.2  Scope of Testing',
        'Our procedures included examining evidence supporting the description and the design and operating effectiveness of the controls. Our tests of controls included inquiry, observation, inspection of documents and records, and re-performance of controls. We believe our examination provides a reasonable basis for our opinion.'),
      ...tplSubsection('sec_8_3', '8.3  Our Conclusion',
        `Based on our examination, in our opinion, in all material respects, as at ${periodEnd}:\n\n(i)   The description fairly presents ${company}'s system as designed and implemented throughout the period.\n\n(ii)  The controls related to the stated control objectives were suitably designed throughout the period.`),
      p(complianceScore >= 85
        ? `(iii) The controls tested operated effectively throughout the period ${periodStart} to ${periodEnd}, with no material exceptions noted.`
        : `(iii) The controls tested operated with ${overdue} exception(s) noted. Details and management responses are provided in Section 9.`),
      ...tplSubsection('sec_8_4', '8.4  Basis of Opinion',
        `Our examination was conducted in accordance with the criteria established by ${company} management and set out in Section 6 of this report. We believe the criteria used are suitable and available to user entities and their auditors. Our independence and quality management policies have been applied throughout the engagement.`),
      ...tplSubsection('sec_8_5', '8.5  Legend',
        'Effective: No material deviations noted; controls operated effectively throughout the period\n\nReview needed: Some weaknesses identified; improvements recommended; controls substantially effective\n\nException: Critical weaknesses noted; controls not operating effectively; immediate remediation required'),
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

      const result = getDomainResult(domainControls);
      const statusText = getStatusText(result);
      const completedInDomain = domainControls.filter(c => c.status === 'Completed').length;
      const overdueInDomain = domainControls.filter(c => c.status === 'Overdue').length;

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${domain}   `, bold: true, size: 26 }),
            new TextRun({ text: result, bold: true, size: 24, color: getResultColor(result) }),
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
                dataCell(getControlResult(ctrl.status), {
                  bold: true,
                  color: getResultColor(getControlResult(ctrl.status)),
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
      ...tplSubsection('sec_10_1', '10.1  Change Management Process',
        `${company} operates a formal change management process for in-scope systems and services. Changes should be documented, risk-assessed, approved, tested where relevant, and reviewed after implementation according to their urgency and potential impact.`),
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
      ...tplSubsection('sec_10_2', '10.2  Testing and Rollback',
        'All Normal changes must include a documented test plan, a rollback procedure, and evidence of successful testing in a non-production environment before CAB approval is granted. Emergency changes undergo a formal post-implementation review within 48 hours of deployment to verify effectiveness and identify any unintended consequences.'),
      ...tplSubsection('sec_10_3', '10.3  Segregation of Duties in Change Process',
        'No individual is permitted to both request and approve a change to production systems. The CAB includes representatives from Operations, Security, and at least one business stakeholder. Changes affecting security controls or cryptographic configurations require CISO sign-off in addition to standard CAB approval.'),
    );

    // ── SECTION 11: BUSINESS CONTINUITY & INCIDENT MANAGEMENT ───────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '11.  Business Continuity and Incident Management', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_11_1', '11.1  Business Continuity Planning',
        `${company} maintains a Business Continuity Plan (BCP) and Disaster Recovery Plan (DRP) that are reviewed and tested annually. The plans define Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) for all critical services, as summarized below.`),
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
      ...tplSubsection('sec_11_2', '11.2  Incident Management Process',
        `Security incidents are managed through a formal incident response process covering detection, triage, containment, eradication, recovery, and post-incident review phases. Escalation procedures should define ownership, severity, communication requirements, and target response times.\n\n${company} maintains an incident register that records incidents, their classification, root cause analysis, and remediation actions. Incidents affecting customer data are reported to affected user entities in accordance with GDPR and contractual requirements.`),
      ...tplSubsection('sec_11_3', '11.3  Testing and Exercises',
        'Business continuity and disaster recovery capabilities are tested at least annually through tabletop exercises and live failover tests. Results are documented and used to update the BCP/DRP. The most recent full DR test was completed successfully within the reporting period.'),
    );

    // ── SECTION 12: ACCESS MANAGEMENT ───────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '12.  Access Management and Segregation of Duties', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_12_1', '12.1  Access Control Principles',
        `${company} enforces the principles of least privilege and need-to-know for access to systems and data. Access rights are granted based on job role and should be documented in an access control matrix. Access requests require formal approval from the relevant system or process owner.`),
      ...tplSubsection('sec_12_2', '12.2  Identity and Authentication',
        'User accounts should require multi-factor authentication for access to in-scope production systems where supported. Privileged access should be restricted, approved, logged, and subject to periodic review.'),
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
      ...tplSubsection('sec_12_3', '12.3  Segregation of Duties',
        `${company} enforces segregation of duties (SoD) across key IT processes. Roles with conflicting responsibilities — such as development and production deployment, or request and approval of access — are identified in the SoD matrix and are not permitted to be held by the same individual. Automated controls in the ITSM platform enforce this separation for change management and access request workflows.`),
      ...tplSubsection('sec_12_4', '12.4  Periodic Access Reviews',
        'All user access rights are reviewed quarterly by system owners. Privileged access is reviewed monthly. Any access rights that are no longer required are revoked within five business days of identification. Access is automatically disabled upon employee termination or role change as triggered by the HR system integration.'),
    );

    // ── SECTION 13: DATA PRIVACY AND GDPR ───────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '13.  Data Privacy and GDPR Compliance', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_13_1', '13.1  Data Privacy Framework',
        `${company} operates a data privacy framework aligned with the General Data Protection Regulation (GDPR) (EU) 2016/679 and applicable national data protection legislation. A Data Protection Officer (DPO) has been appointed and is responsible for monitoring compliance, advising on data protection obligations, and acting as the contact point for supervisory authorities and data subjects.\n\nThe privacy framework covers the full lifecycle of personal data processing, from collection and lawful basis documentation through to retention, disposal, and data subject rights fulfilment. Privacy by Design and by Default principles are applied when developing or modifying systems that process personal data.`),
      ...tplSubsection('sec_13_2', '13.2  Personal Data Processing Activities',
        `${company} maintains a Record of Processing Activities (RoPA) as required under GDPR Article 30. The following table summarises the principal categories of personal data processed in connection with in-scope services:`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Processing Activity', 'Data Categories', 'Lawful Basis', 'Retention Period', 'Third-Party Transfers'].map(h => hdrCell(h)) }),
          ...[
            ['Customer account management', 'Name, email, role, organisation', 'Contract performance', 'Duration of contract + 3 years', 'Identity provider (processor)'],
            ['Financial transaction processing', 'Transaction data, bank references, invoice data', 'Contract performance / legal obligation', 'Duration of contract + 7 years (accounting law)', 'Payment and ERP integrations (processors)'],
            ['System access logging', 'User ID, IP address, action, timestamp', 'Legitimate interest (security)', '12 months rolling', 'SIEM / log management (processor)'],
            ['Support and incident management', 'Contact details, system data, correspondence', 'Contract performance', '3 years post-closure', 'ITSM platform (processor)'],
            ['Employee HR records', 'Name, contact, contract, payroll', 'Contract / legal obligation', 'Duration of employment + applicable legal period', 'Payroll processor'],
            ['Security awareness training', 'Name, e-mail, training completion records', 'Legitimate interest (security compliance)', 'Duration of employment + 2 years', 'LMS platform (processor)'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...tplSubsection('sec_13_3', '13.3  Data Subject Rights',
        `${company} has implemented documented procedures to respond to data subject requests under GDPR Articles 15–22. These include the rights of access, rectification, erasure, restriction of processing, data portability, and objection. All requests are acknowledged within 72 hours and fulfilled within 30 days. Where requests cannot be fulfilled, a reasoned refusal is provided to the data subject.`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Right', 'GDPR Article', 'Procedure in Place', 'Response SLA'].map(h => hdrCell(h)) }),
          ...[
            ['Right of Access (SAR)', 'Art. 15', 'DPO-managed intake, identity verification, data extraction', '30 calendar days'],
            ['Right to Rectification', 'Art. 16', 'Self-service in portal; DPO-assisted for complex cases', '30 calendar days'],
            ['Right to Erasure ("Right to be Forgotten")', 'Art. 17', 'Documented erasure workflow covering all processors', '30 calendar days'],
            ['Right to Restriction', 'Art. 18', 'Flag applied to account; processing suspended pending review', '72 hours acknowledgement'],
            ['Right to Data Portability', 'Art. 20', 'Export in machine-readable format (JSON/CSV) upon request', '30 calendar days'],
            ['Right to Object', 'Art. 21', 'Processing suspended immediately pending legitimate interest assessment', '72 hours acknowledgement'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...tplSubsection('sec_13_4', '13.4  Data Breach Notification',
        `In the event of a personal data breach, ${company} follows a documented breach response procedure. Confirmed breaches involving risk to data subjects are notified to the relevant supervisory authority within 72 hours of discovery (GDPR Art. 33). Where a high risk to individuals is identified, affected data subjects are notified without undue delay (GDPR Art. 34). All breaches, including near-misses, are recorded in the breach register maintained by the DPO.`),
      ...tplSubsection('sec_13_5', '13.5  Data Protection Impact Assessments (DPIA)',
        `${company} conducts Data Protection Impact Assessments for new processing activities that are likely to result in high risk to individuals, as required under GDPR Article 35. DPIA triggers include: introduction of new processing systems, significant changes to existing processing, use of new technologies, large-scale processing of sensitive data, and systematic monitoring. DPIAs are documented, reviewed by the DPO, and approved by the CISO prior to implementation.`),
      new Paragraph({ text: '', spacing: { after: 300 } }),
    );

    // ── SECTION 14: VULNERABILITY MANAGEMENT ─────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '14.  Vulnerability Management and Penetration Testing', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_14_1', '14.1  Vulnerability Identification and Classification',
        `${company} maintains a formal vulnerability management process covering all in-scope systems. Vulnerabilities are identified through automated scanning, manual assessments, threat intelligence feeds, vendor advisories, and penetration testing. Each identified vulnerability is classified using the Common Vulnerability Scoring System (CVSS) and mapped to a remediation priority based on the following criteria:`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['CVSS Score', 'Severity', 'Remediation SLA', 'Escalation'].map(h => hdrCell(h)) }),
          ...[
            ['9.0 – 10.0', 'Critical', 'Patch or mitigate within 24 hours', 'Immediate CISO and CTO notification'],
            ['7.0 – 8.9', 'High', 'Patch or mitigate within 7 days', 'Notified to CISO within 24 hours'],
            ['4.0 – 6.9', 'Medium', 'Patch within 30 days', 'Tracked in vulnerability register'],
            ['0.1 – 3.9', 'Low', 'Patch within 90 days or accept with documented rationale', 'Tracked in vulnerability register'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0, color: j === 0 ? (row[0] === '9.0 – 10.0' ? 'dc2626' : row[0] === '7.0 – 8.9' ? 'd97706' : row[0] === '4.0 – 6.9' ? '2563eb' : undefined) : undefined })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...tplSubsection('sec_14_2', '14.2  Automated Scanning Program',
        `Automated vulnerability scans are performed on all in-scope systems on a defined schedule. Scan results are reviewed by the IT Operations team, triaged by the CISO, and tracked in the vulnerability management system until remediation is confirmed. False positives are documented with supporting rationale.`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Scan Type', 'Scope', 'Frequency', 'Tooling Category'].map(h => hdrCell(h)) }),
          ...[
            ['Network Vulnerability Scan', 'All production network hosts', 'Weekly', 'Network scanner (authenticated)'],
            ['Web Application Scan', 'All public-facing and internal web apps', 'Weekly', 'DAST / web application scanner'],
            ['Container and Image Scan', 'All container images pre-deployment', 'Every build (CI/CD pipeline)', 'Container security scanner'],
            ['Static Application Security Testing', 'All application source code', 'Every code commit (CI/CD)', 'SAST tooling'],
            ['Dependency and SCA Scan', 'All third-party libraries and packages', 'Weekly', 'Software Composition Analysis'],
            ['Cloud Configuration Review', 'All cloud infrastructure and IaC', 'Weekly', 'CSPM / cloud security posture'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...tplSubsection('sec_14_3', '14.3  Penetration Testing',
        `${company} engages qualified independent third-party security firms to conduct penetration tests of in-scope systems on an annual basis at minimum. Additional targeted tests are commissioned following significant system changes or at the direction of the CISO. Penetration testing scope, methodology, and findings are documented, and remediation of identified findings is tracked to completion.`),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Test Type', 'Scope', 'Frequency', 'Methodology'].map(h => hdrCell(h)) }),
          ...[
            ['External Network Penetration Test', 'Internet-facing infrastructure and services', 'Annual', 'Black-box / grey-box; PTES / OWASP'],
            ['Internal Network Penetration Test', 'Internal network segments and systems', 'Annual', 'Grey-box; assumed-breach scenario'],
            ['Web Application Penetration Test', 'In-scope web applications and APIs', 'Annual (+ after major releases)', 'OWASP Testing Guide'],
            ['Social Engineering Assessment', 'All employees', 'Annual', 'Phishing simulation + vishing scenario'],
            ['Red Team Exercise', 'Full attack surface', 'Bi-annual', 'Adversary simulation; MITRE ATT&CK'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...tplSubsection('sec_14_4', '14.4  Patch Management',
        `Patches and security updates for all in-scope systems are tracked, evaluated, and applied in accordance with the vulnerability remediation SLAs defined in Section 14.1. Patch deployment follows the change management process described in Section 10. Emergency patches for critical vulnerabilities may follow the emergency change process with post-implementation review. Patch compliance rates are monitored monthly and reported to the CISO.\n\nOperating systems, middleware, databases, and third-party libraries are covered by the patch management program. End-of-life (EOL) software and systems are identified, tracked, and subject to a migration or decommission plan approved by the CISO. No EOL systems may remain in production without documented risk acceptance and compensating controls.`),
      new Paragraph({ text: '', spacing: { after: 300 } }),
    );

    // ── SECTION 15: SUMMARY ─────────────────────────────────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: '15.  Summary and Recommendations', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
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
      new Paragraph({ text: tplTitle('sec_app_b', 'Appendix B – Glossary of Terms'), heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...(() => { const b = tplBody('sec_app_b_intro', 'The following glossary defines key terms used throughout this ISAE 3402 Type II report.'); return b !== null ? bodyParagraphs(b) : []; })(),
    );

    const glossary = [
      ['Term', 'Definition'],
      ['ISAE 3402', 'International Standard on Assurance Engagements 3402, "Assurance Reports on Controls at a Service Organization." Issued by the International Auditing and Assurance Standards Board (IAASB).'],
      ['Type II Report', 'An ISAE 3402 report that covers both the design and operating effectiveness of controls over a defined period (typically 6–12 months).'],
      ['Type I Report', 'An ISAE 3402 report covering only the suitability of design of controls at a point in time. Does not include testing of operating effectiveness.'],
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
      ['DPO', 'Data Protection Officer — an individual designated under GDPR Article 37 to oversee data protection strategy and compliance.'],
      ['SIEM', 'Security Information and Event Management — a system that collects, correlates, and analyses security data from across an organisation\'s IT environment in real time.'],
      ['ISO 27001', 'International standard specifying requirements for establishing, implementing, maintaining, and continually improving an Information Security Management System (ISMS).'],
      ['ISO 27002', 'International standard providing guidance on information security controls, supplementing ISO 27001 with specific control implementation guidance.'],
      ['GDPR', 'General Data Protection Regulation (EU) 2016/679 — the European Union regulation governing the processing of personal data and the free movement of such data.'],
      ['DPIA', 'Data Protection Impact Assessment — a process to identify and minimise data protection risks for high-risk processing activities, required under GDPR Article 35.'],
      ['RoPA', 'Record of Processing Activities — documentation of all personal data processing activities, maintained by data controllers and certain processors under GDPR Article 30.'],
      ['CVSS', 'Common Vulnerability Scoring System — an open framework for communicating the severity characteristics of software vulnerabilities, scored on a scale of 0–10.'],
      ['DAST', 'Dynamic Application Security Testing — a testing approach that analyses a running application for vulnerabilities from the outside, simulating an external attacker.'],
      ['SAST', 'Static Application Security Testing — analysis of source code, bytecode, or binary to identify security vulnerabilities before the application is executed.'],
      ['SCA', 'Software Composition Analysis — tooling that identifies open-source and third-party dependencies in a codebase and checks them for known vulnerabilities.'],
      ['CSPM', 'Cloud Security Posture Management — tools and processes that continuously monitor cloud infrastructure for misconfigurations and compliance violations.'],
      ['ISMS', 'Information Security Management System — a framework of policies, procedures, and controls that manage information security risks systematically.'],
      ['BCP', 'Business Continuity Plan — a documented plan describing how an organisation will continue operating during and after a disruptive event.'],
      ['DRP', 'Disaster Recovery Plan — a documented set of procedures to recover and restore IT systems and data following a disaster or major outage.'],
      ['OWASP', 'Open Web Application Security Project — a non-profit foundation providing free, openly available articles, methodologies, and tools for web application security.'],
      ['TLS', 'Transport Layer Security — a cryptographic protocol that provides end-to-end encryption for data transmitted over a network.'],
      ['AES-256', 'Advanced Encryption Standard with a 256-bit key — a symmetric encryption algorithm widely regarded as a standard for encrypting data at rest.'],
      ['Zero Trust', 'A security model based on the principle "never trust, always verify" — no user or system is trusted by default, regardless of network location.'],
      ['SLA', 'Service Level Agreement — a contract between a service provider and a user entity defining expected levels of service, availability, and performance.'],
      ['PTES', 'Penetration Testing Execution Standard — a comprehensive methodology and standard for conducting penetration tests.'],
      ['MITRE ATT&CK', 'A globally accessible knowledge base of adversary tactics, techniques, and procedures based on real-world observations, used for threat modelling and red team planning.'],
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
    );

    // ── APPENDIX C: AUDIT EVIDENCE AND TESTING APPROACH ──────────────────────
    children.push(new Paragraph({ pageBreakBefore: true, text: '' }));
    children.push(
      new Paragraph({ text: tplTitle('sec_app_c', 'Appendix C – Audit Evidence and Testing Approach'), heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      ...tplSubsection('sec_app_c_intro', '', 'This appendix describes the evidence categories and testing procedures used to assess the design and operating effectiveness of controls included in this report. Testing was conducted in accordance with ISAE 3402 requirements and professional auditing standards.'),
      ...tplSubsection('sec_app_c_1', 'C.1  Evidence Categories', ''),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Evidence Category', 'Description', 'Examples'].map(h => hdrCell(h)) }),
          ...[
            ['Inquiry', 'Oral or written responses obtained from management and personnel responsible for operating controls.', 'Interviews with CISO, IT Operations, HR, DPO'],
            ['Observation', 'Direct observation of a control being performed.', 'Watching a change approval process, access review meeting, or training session'],
            ['Inspection of Documents', 'Examination of paper-based or electronic records, reports, or policies.', 'Policy documents, risk register, access logs, patch records, training completion reports'],
            ['Inspection of Systems', 'Direct examination of system configurations, settings, or outputs.', 'Firewall rules, IAM permissions, system configuration screenshots'],
            ['Re-performance', 'Independent execution of a control procedure to verify it produces the same result.', 'Re-running a user access review, re-calculating a risk score, re-testing a backup restore'],
            ['Analytical Procedures', 'Evaluation of plausibility of information through analysis of relationships among data.', 'Trend analysis of overdue controls, comparison of scan results across periods'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...tplSubsection('sec_app_c_2', 'C.2  Testing Approach by Control Type', ''),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Control Type', 'Definition', 'Primary Test Procedures', 'Sample Basis'].map(h => hdrCell(h)) }),
          ...[
            ['Preventive', 'Controls designed to prevent an error or irregularity from occurring.', 'Inspection of configuration; re-performance; inquiry', 'Configural controls: full population; transactional: sample'],
            ['Detective', 'Controls designed to identify errors or irregularities after they occur.', 'Inspection of logs, reports, and exception handling records; inquiry', 'Statistical sample of exception reports over the period'],
            ['Corrective', 'Controls designed to correct identified errors or irregularities.', 'Inspection of remediation records; inquiry of responsible parties', 'All identified exceptions reviewed for timely remediation'],
            ['Manual', 'Controls performed by individuals without automated system support.', 'Inquiry + inspection of supporting evidence; re-performance where possible', 'Risk-based sample; minimum 25 items or full population for low-volume'],
            ['Automated (IT General Control)', 'Controls embedded in systems and performed consistently by the system.', 'Inspection of system settings; re-performance; review of change log', 'Configural test of design; one sample instance sufficient if no changes'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
      ...tplSubsection('sec_app_c_3', 'C.3  Sampling Methodology', 'Where sampling is applied, sample sizes are determined based on the frequency and population size of the control, as follows:'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Control Frequency', 'Approximate Annual Population', 'Minimum Sample Size'].map(h => hdrCell(h)) }),
          ...[
            ['Daily', '~250 instances per year', '25 items'],
            ['Weekly', '~52 instances per year', '15 items'],
            ['Monthly', '~12 instances per year', '6 items (all, if fewer than 6)'],
            ['Quarterly', '~4 instances per year', '2 items'],
            ['Annual', '1 instance per year', '1 item (full population)'],
            ['Ad hoc / Event-driven', 'Varies', 'All instances or risk-based sample; minimum 5 if > 5 events'],
          ].map(row => new TableRow({ children: row.map((cell, j) => dataCell(cell, { bold: j === 0 })) })),
        ],
      }),
      ...(() => { const b = tplBody('sec_app_c_3_trail', 'Sample items are selected using random or systematic selection methods. Items are selected from across the full reporting period to provide evidence about the entire period and not just point-in-time effectiveness.'); return b !== null ? bodyParagraphs(b) : []; })(),
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
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
      doc.setFontSize(8);
      const lineH = 3.8;
      const padX = 1.5;
      const padY = 2.4;
      const wrapped = cols.map((col, i) => doc.splitTextToSize(col || '-', colWidths[i] - padX * 2));
      const rowH = Math.max(8, Math.max(...wrapped.map(cell => cell.length)) * lineH + padY * 2);
      checkPage(rowH + 2);
      const rowTop = y;
      let x = margin;
      if (isHeader) {
        doc.setFillColor(30, 64, 175);
        doc.rect(margin, rowTop, contentW, rowH, 'F');
      }
      doc.setTextColor(isHeader ? 255 : 55, isHeader ? 255 : 65, isHeader ? 255 : 81);
      wrapped.forEach((cell, i) => {
        doc.text(cell, x + padX, rowTop + padY + 3, { lineHeightFactor: 1.15 });
        x += colWidths[i];
      });
      y += rowH;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(margin, y, margin + contentW, y);
      y += 0.5;
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
    { const txt = tplBody('sec_3_1', `${company} management confirms that this report accurately describes the company's general IT controls for the period ${periodStart} to ${periodEnd}. The description covers the control objectives established by management, the actual controls implemented, and the conditions under which these controls operate.\n\nManagement is responsible for designing, implementing, and maintaining effective controls. This report has been prepared to provide relevant information to user entities and their auditors.`); if (txt !== null) { txt.split(/\n\s*\n/).forEach(block => block.split('\n').filter(Boolean).forEach(line => body(line))); } }
    y += 4;
    h2('1b.  Management Assertion');
    { const txt = tplBody('sec_3_2', `Based on the criteria established in the ISAE 3402 standard, ${company} management asserts that:\n\n• The description fairly presents the system as designed and implemented throughout the specified period.\n\n• The controls related to the stated control objectives were suitably designed throughout the specified period.\n\n• The controls operated effectively throughout the period to provide reasonable assurance that control objectives were achieved.`); if (txt !== null) { txt.split(/\n\s*\n/).forEach(block => block.split('\n').filter(Boolean).forEach(line => body(line))); } }

    // ── P3: CONTROL ENVIRONMENT ──────────────────────────────────────
    y += 6;
    h1('2.  Description of the IT Control Environment');
    h2('2a.  Overview of Services');
    { const txt = tplBody('sec_2_1', company.toLowerCase().includes('simteq') ? SIMTEQ_COMPANY_OVERVIEW : `${company} operates services for user entities supported by documented general IT controls and information security controls.`); if (txt !== null) { txt.split(/\n\s*\n/).forEach(block => block.split('\n').filter(Boolean).forEach(line => body(line))); } }
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
    { const txt = tplBody('sec_8_intro', `To: ${company} and its User Entities\n\nWe have examined the description of ${company}'s General IT Controls and have performed tests of controls necessary to form an opinion on the design and operating effectiveness of those controls.`); if (txt !== null) { txt.split(/\n\s*\n/).forEach(block => block.split('\n').filter(Boolean).forEach(line => body(line))); } }
    y += 4;
    h2('Legend');
    body('Effective: No material deviations noted during the period');
    body('Review needed: Some weaknesses identified - improvements recommended');
    body('Exception: Critical weaknesses noted - immediate remediation required');

    // ── P5+: CONTROL OBJECTIVES TABLE ────────────────────────────────
    addPage();
    h1('4.  Control Objectives, Security Measures, Tests and Findings');

    const ctrlCols = ['ID', 'Control Objective', 'Freq.', 'Status', 'Result'];
    const ctrlColW = [14, contentW - 14 - 20 - 26 - 28, 20, 26, 28];

    for (const domain of ISO_DOMAINS) {
      const domainControls = controls.filter(c => c.category === domain);
      if (domainControls.length === 0) continue;

      const result = getDomainResult(domainControls);
      const completedInDomain = domainControls.filter(c => c.status === 'Completed').length;

      checkPage(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text(domain, margin, y);
      doc.setTextColor(...getResultRgb(result));
      doc.text(`  ${result}`, margin + doc.getTextWidth(domain), y);
      y += 6;

      tableRow(ctrlCols, ctrlColW, true);
      domainControls.forEach(ctrl => {
        tableRow([ctrl.id, ctrl.title, ctrl.frequency || '–', ctrl.status, getControlResult(ctrl.status)], ctrlColW);
      });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      checkPage(6);
      doc.text(`Finding: ${completedInDomain}/${domainControls.length} controls completed. ${getStatusText(result)}.`, margin, y + 2);
      y += 8;
    }

    // ── SUMMARY ──────────────────────────────────────────────────────
    checkPage(50);
    h1('5.  Summary and Recommendations');
    body(`Overall compliance score: ${complianceScore}%  |  Controls: ${controls.length} total, ${completed} completed, ${overdue} overdue`);
    body(`Risks: ${risks.length} total, ${highRisks} high-priority (score ≥ 7)`);
    { const txt = tplBody('sec_13_recs', `1. ${overdue > 0 ? `Prioritize remediation of the ${overdue} overdue control(s) identified above. Assign dedicated owners and set target completion dates within 30 days.` : 'Maintain the current strong control completion rate and continue quarterly control reviews.'}\n\n2. ${highRisks > 0 ? `Develop and implement formal mitigation plans for the ${highRisks} high-priority risk(s) identified. Senior management should review progress monthly.` : 'Continue proactive risk identification and maintain the risk register with semi-annual formal reviews.'}\n\n3. Ensure all user entities have reviewed and implemented the Complementary User Entity Controls (CUECs) documented in Section 4 of this report.\n\n4. Continue annual testing of the Business Continuity and Disaster Recovery plans, incorporating lessons learned from the current reporting period.\n\n5. Review and update the Access Control Matrix following any organizational changes to ensure least-privilege principles are maintained.`); if (txt !== null) { txt.split(/\n\s*\n/).forEach(block => block.split('\n').filter(Boolean).forEach(line => body(line))); } }

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
            <DialogDescription className="text-xs text-slate-400 mt-1">
              {template?.company_name ?? 'SIMTEQ AS'} · Type II · {template ? `${template.period_start} – ${template.period_end}` : 'Reporting period'}
            </DialogDescription>
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
                    { icon: <Shield className="w-3.5 h-3.5" />, label: 'Sections', value: '15+', sub: 'incl. appendices' },
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
                      '2. System Description + Service Commitments',
                      '3. Management Statement & Assertion',
                      '4. Complementary User Entity Controls',
                      '5. Sub-service Organizations',
                      '6. IT Control Environment (incl. Policy & Training)',
                      '7. Risk Register + Treatment Plan',
                      "8. Independent Auditor's Report",
                      '9. Control Objectives & Test Results',
                      '10. Change Management Controls',
                      '11. Business Continuity & Incident Management',
                      '12. Access Management & Segregation of Duties',
                      '13. Data Privacy & GDPR Compliance',
                      '14. Vulnerability Management & Pen Testing',
                      '15. Summary & Recommendations',
                      'Appendix A: Complete Control Listing',
                      'Appendix B: Glossary of Terms (35+ terms)',
                      'Appendix C: Audit Evidence & Testing Approach',
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
                            const result = getDomainResult(dc);
                            const comp = dc.filter(c => c.status === 'Completed').length;
                            const resultClass = result === 'Effective'
                              ? 'text-green-700 bg-green-50 border-green-200'
                              : result === 'Exception'
                                ? 'text-red-700 bg-red-50 border-red-200'
                                : 'text-amber-700 bg-amber-50 border-amber-200';
                            return (
                              <tr key={domain} className="hover:bg-slate-50/50">
                                <td className="px-3 py-1.5 text-slate-700">{domain}</td>
                                <td className="px-3 py-1.5 text-right text-slate-400">{comp}/{dc.length}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ${resultClass}`}>
                                    {result}
                                  </span>
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
                      {['Cover page + Table of Contents', '15 compliance sections', 'Data Privacy & GDPR section', 'Vulnerability Management section', 'Full control test results', 'Risk register + treatment plan', 'Appendices A, B & C (35+ glossary terms)'].map(item => (
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
