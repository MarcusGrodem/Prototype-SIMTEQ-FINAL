import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
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
  Shield,
  TrendingUp,
  Clock,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Risk, Control, ReportTemplate, ReportTemplateSection } from '../../lib/types';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import {
  exportControlPopulationCsv,
  exportEvidenceIndexCsv,
  exportDeviationSummaryCsv,
} from '../../lib/type2AuditorExports';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
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

type CoverImagePayload = {
  dataUrl: string;
  docxType: 'png' | 'jpg';
  pdfType: 'PNG' | 'JPEG';
  name: string;
  caption: string;
  widthMm: number;
};

const COVER_IMAGE_SECTION_KEY = 'cover_image';
const TEMPLATE_LAYOUT_SECTION_KEY = 'template_layout_settings';

function parseTemplateLayoutSettings(section?: ReportTemplateSection) {
  if (!section?.body) return { includeFrontPage: true, pageBreaks: {} as Record<string, boolean> };
  try {
    const parsed = JSON.parse(section.body) as {
      includeFrontPage?: unknown;
      pageBreaks?: unknown;
    };
    return {
      includeFrontPage: parsed.includeFrontPage !== false,
      pageBreaks: parsed.pageBreaks && typeof parsed.pageBreaks === 'object'
        ? parsed.pageBreaks as Record<string, boolean>
        : {},
    };
  } catch {
    return { includeFrontPage: true, pageBreaks: {} as Record<string, boolean> };
  }
}

function parseCoverImageSettings(section?: ReportTemplateSection) {
  if (!section?.body) return null;
  try {
    const parsed = JSON.parse(section.body) as {
      dataUrl?: unknown;
      name?: unknown;
      caption?: unknown;
      widthMm?: unknown;
    };
    return {
      dataUrl: typeof parsed.dataUrl === 'string' ? parsed.dataUrl : '',
      name: typeof parsed.name === 'string' ? parsed.name : '',
      caption: typeof parsed.caption === 'string' ? parsed.caption : '',
      widthMm: Math.min(170, Math.max(60, Number(parsed.widthMm) || 120)),
    };
  } catch {
    return null;
  }
}

function getCoverImagePayload(template: ReportTemplate | null, sections: Record<string, ReportTemplateSection>): CoverImagePayload | null {
  const sectionSettings = parseCoverImageSettings(sections[COVER_IMAGE_SECTION_KEY]);
  const dataUrl = template?.cover_image_data_url || sectionSettings?.dataUrl;
  if (!dataUrl) return null;
  const basePayload = {
    dataUrl,
    name: template?.cover_image_name || sectionSettings?.name || 'Cover image',
    caption: template?.cover_image_caption || sectionSettings?.caption || '',
    widthMm: Math.min(170, Math.max(60, Number(template?.cover_image_width_mm ?? sectionSettings?.widthMm) || 120)),
  };
  if (dataUrl.startsWith('data:image/png')) return { ...basePayload, docxType: 'png', pdfType: 'PNG' };
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return { ...basePayload, docxType: 'jpg', pdfType: 'JPEG' };
  return null;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function readImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function fitImage(width: number, height: number, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: width * ratio,
    height: height * ratio,
  };
}

function mmToWordPx(mm: number) {
  return Math.round(mm * 3.78);
}

interface AuditReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportTemplate?: ReportTemplate | null;
  reportTemplateSections?: ReportTemplateSection[];
  templateRevision?: string | null;
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

export function AuditReportGenerator({
  open,
  onOpenChange,
  reportTemplate,
  reportTemplateSections,
  templateRevision,
}: AuditReportGeneratorProps) {
  const { activePeriod } = useAuditPeriod();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [customInstructions, setCustomInstructions] = useState('');
  const [csvExporting, setCsvExporting] = useState<string | null>(null);
  const [csvExportError, setCsvExportError] = useState<string | null>(null);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [sectionMap, setSectionMap] = useState<Record<string, ReportTemplateSection>>({});
  const [reportData, setReportData] = useState<{
    controls: Control[];
    risks: Risk[];
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    if (reportTemplate) {
      const map: Record<string, ReportTemplateSection> = {};
      (reportTemplateSections || []).forEach(s => { map[s.section_key] = s; });
      setTemplate(reportTemplate);
      setSectionMap(map);
      return;
    }

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
  }, [open, reportTemplate, reportTemplateSections, templateRevision]);

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
    const periodStart = template?.period_start ?? activePeriod?.start_date ?? 'January 1, 2025';
    const periodEnd = template?.period_end ?? activePeriod?.end_date ?? 'December 31, 2025';
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

  const visibleReportSections = () => Object.values(sectionMap)
    .filter(section => section.visible && section.section_key !== 'cover_subtitle' && section.section_key !== 'footer' && section.section_key !== COVER_IMAGE_SECTION_KEY && section.section_key !== TEMPLATE_LAYOUT_SECTION_KEY)
    .sort((a, b) => a.position - b.position);

  const visibleSectionBody = (section: ReportTemplateSection) => substitute(section.body || '').trim();
  const layoutSettings = () => parseTemplateLayoutSettings(sectionMap[TEMPLATE_LAYOUT_SECTION_KEY]);
  const includeFrontPage = () => template?.include_front_page ?? layoutSettings().includeFrontPage;
  const startsNewPage = (section: ReportTemplateSection) => {
    const savedValue = layoutSettings().pageBreaks[section.section_key];
    return savedValue ?? section.page_break_before ?? true;
  };

  const sectionHeadingLevel = (title: string) => /^\d+\.\s/.test(title) || /^Appendix\s/i.test(title)
    ? HeadingLevel.HEADING_1
    : HeadingLevel.HEADING_2;

  const wordParagraphsFromTemplateBody = (body: string): Paragraph[] => {
    if (!body) return [];
    const paragraphs: Paragraph[] = [];
    for (const block of body.split(/\n\s*\n/)) {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      for (const line of lines) {
        paragraphs.push(new Paragraph({ text: line, spacing: { after: line.startsWith('•') || line.startsWith('-') ? 120 : 200 } }));
      }
    }
    return paragraphs;
  };

  const wordHeaderCell = (text: string) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: 'ffffff' })] })],
    shading: { type: ShadingType.SOLID, color: '1e3a8a', fill: '1e3a8a' },
  });

  const wordDataCell = (text: string, opts: { bold?: boolean; color?: string; mono?: boolean } = {}) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({
        text: text || '-',
        bold: opts.bold,
        size: 18,
        color: opts.color,
        font: opts.mono ? 'Courier New' : undefined,
      })],
    })],
  });

  const appendWordLiveData = (children: (Paragraph | Table)[], controls: Control[], risks: Risk[]) => {
    const completed = controls.filter(c => c.status === 'Completed').length;
    const overdue = controls.filter(c => c.status === 'Overdue').length;
    const highRisks = risks.filter(r => r.risk_score >= 7).length;
    const complianceScore = controls.length > 0 ? Math.round((completed / controls.length) * 100) : 0;

    children.push(
      new Paragraph({ pageBreakBefore: true, text: 'Generated Control and Risk Data', heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['Metric', 'Value'].map(wordHeaderCell) }),
          new TableRow({ children: [wordDataCell('Compliance score', { bold: true }), wordDataCell(`${complianceScore}%`)] }),
          new TableRow({ children: [wordDataCell('Controls completed', { bold: true }), wordDataCell(`${completed} of ${controls.length}`)] }),
          new TableRow({ children: [wordDataCell('Overdue controls', { bold: true }), wordDataCell(String(overdue), { color: overdue > 0 ? 'dc2626' : '16a34a' })] }),
          new TableRow({ children: [wordDataCell('High risks', { bold: true }), wordDataCell(String(highRisks), { color: highRisks > 0 ? 'd97706' : '16a34a' })] }),
        ],
      }),
      new Paragraph({ text: '', spacing: { after: 300 } }),
    );

    if (controls.length > 0) {
      children.push(
        new Paragraph({ text: 'Control Results', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: ['Control ID', 'Title', 'Domain', 'Owner', 'Frequency', 'Status', 'Result'].map(wordHeaderCell) }),
            ...controls.map(control => new TableRow({
              children: [
                wordDataCell(control.id, { mono: true }),
                wordDataCell(control.title),
                wordDataCell(control.category || '-'),
                wordDataCell(control.owner_name || '-'),
                wordDataCell(control.frequency || '-'),
                wordDataCell(control.status, { color: control.status === 'Completed' ? '16a34a' : control.status === 'Overdue' ? 'dc2626' : 'd97706' }),
                wordDataCell(getControlResult(control.status), { bold: true, color: getResultColor(getControlResult(control.status)) }),
              ],
            })),
          ],
        }),
        new Paragraph({ text: '', spacing: { after: 300 } }),
      );
    }

    if (risks.length > 0) {
      children.push(
        new Paragraph({ text: 'Risk Register', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: ['Risk ID', 'Title', 'Category', 'Score', 'Owner', 'Status'].map(wordHeaderCell) }),
            ...risks.map(risk => new TableRow({
              children: [
                wordDataCell(risk.id, { mono: true }),
                wordDataCell(risk.title),
                wordDataCell(risk.category || '-'),
                wordDataCell(String(risk.risk_score ?? 0), { bold: true, color: (risk.risk_score ?? 0) >= 7 ? 'dc2626' : (risk.risk_score ?? 0) >= 4 ? 'd97706' : '16a34a' }),
                wordDataCell(risk.owner_name || '-'),
                wordDataCell(risk.status || '-'),
              ],
            })),
          ],
        }),
      );
    }
  };

  const handleDownloadWord = async () => {
    if (!reportData) return;
    const { controls, risks } = reportData;
    const { periodStart, periodEnd, generated, company } = getReportMeta();
    const sections = visibleReportSections();
    const coverSubtitle = sectionMap.cover_subtitle?.visible === false
      ? ''
      : substitute(sectionMap.cover_subtitle?.body || '');
    const coverImage = getCoverImagePayload(template, sectionMap);
    const coverImageDimensions = coverImage
      ? await readImageDimensions(coverImage.dataUrl).catch(() => null)
      : null;
    const coverImageFit = coverImageDimensions
      ? fitImage(coverImageDimensions.width, coverImageDimensions.height, coverImage.widthMm, 70)
      : null;
    const coverImageCaption = substitute(coverImage?.caption || '').trim();
    const coverImageChildren: Paragraph[] = coverImage && coverImageFit
      ? [
        new Paragraph({
          children: [new ImageRun({
            type: coverImage.docxType,
            data: dataUrlToUint8Array(coverImage.dataUrl),
            transformation: {
              width: mmToWordPx(coverImageFit.width),
              height: mmToWordPx(coverImageFit.height),
            },
            altText: {
              name: coverImage.name,
              title: coverImage.name,
              description: coverImageCaption || coverImage.name,
            },
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: coverImageCaption ? 120 : 500 },
        }),
        ...(coverImageCaption ? [new Paragraph({
          children: [new TextRun({ text: coverImageCaption, size: 18, color: '6b7280', italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 450 },
        })] : []),
      ]
      : [];
    const coverChildren: Paragraph[] = includeFrontPage()
      ? [
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
        ...(coverSubtitle ? [new Paragraph({
          children: [new TextRun({ text: coverSubtitle, size: 28, color: '374151' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
        })] : []),
        ...coverImageChildren,
        new Paragraph({
          children: [new TextRun({ text: `Reporting period: ${periodStart} - ${periodEnd}`, size: 24, color: '6b7280' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Date of report: ${generated}`, size: 22, color: '9ca3af' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'CONFIDENTIAL - FOR AUTHORIZED USE ONLY', size: 18, color: 'dc2626', bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 1200 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'dc2626' } },
        }),
      ]
      : [];

    const children: (Paragraph | Table)[] = [
      ...coverChildren,
      new Paragraph({ pageBreakBefore: includeFrontPage(), text: 'Table of Contents', heading: HeadingLevel.HEADING_1, spacing: { after: 400 } }),
      ...sections.map(section => new Paragraph({
        text: substitute(section.title || section.section_key),
        spacing: { after: 120 },
      })),
    ];

    sections.forEach(section => {
      const title = substitute(section.title || section.section_key);
      const body = visibleSectionBody(section);
      children.push(
        new Paragraph({
          pageBreakBefore: startsNewPage(section),
          text: title,
          heading: sectionHeadingLevel(title),
          spacing: { after: 250 },
        }),
        ...wordParagraphsFromTemplateBody(body),
      );
    });

    appendWordLiveData(children, controls, risks);

    const footer = sectionMap.footer && sectionMap.footer.visible !== false
      ? substitute(sectionMap.footer.body || '')
      : '';
    if (footer) {
      children.push(new Paragraph({
        children: [new TextRun({ text: footer, size: 18, color: '9ca3af', italics: true })],
        spacing: { before: 600 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'e5e7eb' } },
      }));
    }

    if (customInstructions.trim()) {
      children.push(
        new Paragraph({ text: 'Additional Notes from Management', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
        ...wordParagraphsFromTemplateBody(customInstructions.trim()),
      );
    }

    const doc = new Document({
      creator: `ComplianceOS - ${company}`,
      title: template?.name || 'ISAE 3402 Type II Report',
      description: `${template?.name || 'ISAE 3402 report'} for ${company} - ${periodStart} to ${periodEnd}`,
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

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    const { controls, risks } = reportData;
    const { periodStart, periodEnd, generated, company } = getReportMeta();
    const sections = visibleReportSections();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 24;

    const addPage = () => { doc.addPage(); y = 24; };
    const checkPage = (needed = 10) => { if (y + needed > 280) addPage(); };
    const lineText = (text: string, fontSize = 9, style: 'normal' | 'bold' | 'italic' = 'normal', indent = 0) => {
      doc.setFont('helvetica', style);
      doc.setFontSize(fontSize);
      doc.setTextColor(55, 65, 81);
      const lines = doc.splitTextToSize(text || '-', contentW - indent);
      checkPage(lines.length * (fontSize * 0.42) + 4);
      doc.text(lines, margin + indent, y, { lineHeightFactor: 1.25 });
      y += lines.length * (fontSize * 0.42) + 4;
    };
    const centerText = (text: string, fontSize = 9, style: 'normal' | 'bold' | 'italic' = 'normal') => {
      doc.setFont('helvetica', style);
      doc.setFontSize(fontSize);
      doc.setTextColor(107, 114, 128);
      const lines = doc.splitTextToSize(text || '-', contentW);
      checkPage(lines.length * (fontSize * 0.42) + 4);
      doc.text(lines, pageW / 2, y, { align: 'center', lineHeightFactor: 1.25 });
      y += lines.length * (fontSize * 0.42) + 4;
    };
    const heading = (text: string, level: 1 | 2 = 1) => {
      checkPage(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(level === 1 ? 14 : 11);
      doc.setTextColor(30, 64, 175);
      doc.text(text, margin, y);
      y += level === 1 ? 8 : 6;
      if (level === 1) {
        doc.setDrawColor(30, 64, 175);
        doc.line(margin, y, margin + contentW, y);
        y += 5;
      }
    };
    const rows = (columns: string[], data: string[][]) => {
      const colW = contentW / columns.length;
      const drawRow = (row: string[], header = false) => {
        const wrapped = row.map(cell => doc.splitTextToSize(cell || '-', colW - 3));
        const rowH = Math.max(8, Math.max(...wrapped.map(cell => cell.length)) * 4.2 + 4);
        checkPage(rowH + 2);
        const top = y;
        if (header) {
          doc.setFillColor(30, 64, 175);
          doc.rect(margin, top, contentW, rowH, 'F');
        }
        doc.setFont('helvetica', header ? 'bold' : 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(header ? 255 : 55, header ? 255 : 65, header ? 255 : 81);
        wrapped.forEach((cell, index) => doc.text(cell, margin + index * colW + 1.5, top + 4, { lineHeightFactor: 1.15 }));
        y += rowH;
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, y, margin + contentW, y);
      };
      drawRow(columns, true);
      data.forEach(row => drawRow(row));
      y += 4;
    };

    if (includeFrontPage()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(30, 64, 175);
      doc.text(company, pageW / 2, y, { align: 'center' });
      y += 12;
      doc.setFontSize(16);
      doc.text('ISAE 3402 TYPE II', pageW / 2, y, { align: 'center' });
      y += 10;
      const coverSubtitle = sectionMap.cover_subtitle?.visible === false ? '' : substitute(sectionMap.cover_subtitle?.body || '');
      if (coverSubtitle) lineText(coverSubtitle, 11);
      const coverImage = getCoverImagePayload(template, sectionMap);
      if (coverImage) {
        try {
          const dimensions = await readImageDimensions(coverImage.dataUrl);
          const fitted = fitImage(dimensions.width, dimensions.height, coverImage.widthMm, 80);
          checkPage(fitted.height + 8);
          doc.addImage(coverImage.dataUrl, coverImage.pdfType, (pageW - fitted.width) / 2, y, fitted.width, fitted.height);
          y += fitted.height + 5;
          const caption = substitute(coverImage.caption).trim();
          if (caption) centerText(caption, 8, 'italic');
        } catch (error) {
          console.warn('Could not render cover image in PDF export', error);
        }
      }
      lineText(`Reporting period: ${periodStart} - ${periodEnd}`, 10);
      lineText(`Date of report: ${generated}`, 9);
      addPage();
    }

    heading('Table of Contents');
    sections.forEach(section => lineText(substitute(section.title || section.section_key), 9));

    sections.forEach(section => {
      const title = substitute(section.title || section.section_key);
      if (startsNewPage(section)) {
        addPage();
      } else {
        checkPage(18);
        y += 3;
      }
      heading(title, /^\d+\.\s/.test(title) || /^Appendix\s/i.test(title) ? 1 : 2);
      const body = visibleSectionBody(section);
      if (body) {
        body.split(/\n\s*\n/).forEach(block => {
          block.split('\n').map(line => line.trim()).filter(Boolean).forEach(line => lineText(line, 9, 'normal', line.startsWith('•') || line.startsWith('-') ? 4 : 0));
        });
      }
    });

    addPage();
    heading('Generated Control and Risk Data');
    const completed = controls.filter(c => c.status === 'Completed').length;
    const overdue = controls.filter(c => c.status === 'Overdue').length;
    const highRisks = risks.filter(r => r.risk_score >= 7).length;
    const complianceScore = controls.length > 0 ? Math.round((completed / controls.length) * 100) : 0;
    rows(['Metric', 'Value'], [
      ['Compliance score', `${complianceScore}%`],
      ['Controls completed', `${completed} of ${controls.length}`],
      ['Overdue controls', String(overdue)],
      ['High risks', String(highRisks)],
    ]);
    if (controls.length > 0) {
      heading('Control Results', 2);
      rows(['ID', 'Title', 'Domain', 'Owner', 'Status'], controls.map(control => [control.id, control.title, control.category || '-', control.owner_name || '-', control.status]));
    }
    if (risks.length > 0) {
      heading('Risk Register', 2);
      rows(['ID', 'Title', 'Category', 'Score', 'Status'], risks.map(risk => [risk.id, risk.title, risk.category || '-', String(risk.risk_score ?? 0), risk.status || '-']));
    }
    const footer = sectionMap.footer && sectionMap.footer.visible !== false ? substitute(sectionMap.footer.body || '') : '';
    if (footer) lineText(footer, 8, 'italic');
    if (customInstructions.trim()) {
      heading('Additional Notes from Management', 2);
      lineText(customInstructions.trim(), 9);
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`${company} - ${template?.name || 'ISAE 3402 Type II'} - ${periodStart} to ${periodEnd} | Page ${page} of ${pageCount}`, pageW / 2, 290, { align: 'center' });
    }

    doc.save(`${company.replace(/\s+/g, '_')}_ISAE3402_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleAuditorCsvExport = async (
    key: string,
    exporter: typeof exportControlPopulationCsv
  ) => {
    if (!activePeriod) return;
    setCsvExporting(key);
    setCsvExportError(null);
    try {
      await exporter(activePeriod);
    } catch (error) {
      console.error(error);
      setCsvExportError('Could not generate the auditor CSV. Check the period data and try again.');
    } finally {
      setCsvExporting(null);
    }
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
  const { periodStart: reportPeriodStart, periodEnd: reportPeriodEnd } = getReportMeta();
  const templateSectionRows = Object.values(sectionMap)
    .filter(section => section.section_key !== COVER_IMAGE_SECTION_KEY && section.section_key !== TEMPLATE_LAYOUT_SECTION_KEY)
    .sort((a, b) => a.position - b.position);
  const visibleTemplateSections = templateSectionRows.filter(section => section.visible).length;
  const newPageTemplateSections = templateSectionRows
    .filter(section => section.visible && section.section_key !== 'cover_subtitle' && section.section_key !== 'footer' && startsNewPage(section))
    .length;
  const visibleTemplateSectionLabel = templateSectionRows.length > 0
    ? String(visibleTemplateSections)
    : '15+';
  const reportIncludeItems = [
    `${includeFrontPage() ? 'Front page and table of contents' : 'Table of contents'} from ${template?.name ?? 'the active template'}`,
    ...(getCoverImagePayload(template, sectionMap) && includeFrontPage() ? ['Cover image on the front page'] : []),
    `${visibleTemplateSectionLabel} visible template sections`,
    `${newPageTemplateSections} sections start on a new page`,
    'Generated control results from live data',
    'Generated risk register from live data',
  ];

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
              {template?.company_name ?? 'SIMTEQ AS'} · Type II · {`${reportPeriodStart} – ${reportPeriodEnd}`}
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
                    { icon: <Shield className="w-3.5 h-3.5" />, label: 'Template', value: template?.name ?? 'Default', sub: `${visibleTemplateSectionLabel} editable sections` },
                    { icon: <FileText className="w-3.5 h-3.5" />, label: 'Domains', value: String(ISO_DOMAINS.length), sub: 'ISO 27001' },
                    { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Data source', value: 'Live', sub: 'Supabase DB' },
                    { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Report period', value: reportPeriodStart, sub: reportPeriodEnd },
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
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Report Sections ({template?.name ?? 'Default Template'})</p>
                  {templateSectionRows.length > 0 ? (
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 max-h-72 overflow-y-auto pr-2">
                      {templateSectionRows.map(section => (
                        <div key={section.id} className={`flex items-start gap-1.5 text-xs ${section.visible ? 'text-slate-600' : 'text-slate-400'}`}>
                          <CheckCircle2 className={`w-3 h-3 shrink-0 mt-0.5 ${section.visible ? 'text-green-500' : 'text-slate-300'}`} />
                          <span className={section.visible ? '' : 'line-through'}>{section.title || section.section_key}</span>
                          {section.visible && section.section_key !== 'cover_subtitle' && section.section_key !== 'footer' && (
                            <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1 text-slate-400 border-slate-200">
                              {startsNewPage(section) ? 'Page' : 'Compact'}
                            </Badge>
                          )}
                          {!section.visible && (
                            <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1 text-slate-400 border-slate-200">
                              Hidden
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-amber-200 bg-amber-50 rounded p-3 text-xs text-amber-800">
                      No template sections are loaded. Save or reload the report template before generating.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: config + notes */}
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Configuration</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Report template', value: template?.name ?? 'Default template' },
                      { label: 'Reporting period', value: `${reportPeriodStart} – ${reportPeriodEnd}` },
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
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Uses the active report template plus live control and risk data</p>
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

                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Auditor CSV Pack</p>
                      {activePeriod && (
                        <span className="text-[10px] text-slate-400 truncate">{activePeriod.name}</span>
                      )}
                    </div>

                    {!activePeriod && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2.5 leading-relaxed mb-2">
                        Activate an audit period to export period-scoped auditor CSVs.
                      </div>
                    )}

                    {csvExportError && (
                      <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-2.5 leading-relaxed mb-2">
                        {csvExportError}
                      </div>
                    )}

                    <div className="space-y-2">
                      {[
                        {
                          key: 'control-population',
                          title: 'Export Control Population CSV',
                          description: 'All scheduled control executions in the active period',
                          exporter: exportControlPopulationCsv,
                        },
                        {
                          key: 'evidence-index',
                          title: 'Export Evidence Index CSV',
                          description: 'Evidence linked to active-period executions',
                          exporter: exportEvidenceIndexCsv,
                        },
                        {
                          key: 'deviation-summary',
                          title: 'Export Deviation Summary CSV',
                          description: 'Period deviations with remediation status',
                          exporter: exportDeviationSummaryCsv,
                        },
                      ].map(item => {
                        const disabled = !activePeriod || csvExporting !== null;
                        const isCurrent = csvExporting === item.key;
                        return (
                          <button
                            key={item.key}
                            onClick={() => handleAuditorCsvExport(item.key, item.exporter)}
                            disabled={disabled}
                            className="flex items-start gap-2.5 p-2.5 border border-slate-200 rounded hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left w-full"
                          >
                            <div className="w-7 h-7 bg-emerald-600 rounded flex items-center justify-center shrink-0 mt-0.5">
                              {isCurrent ? (
                                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Report includes</div>
                    <div className="space-y-1">
                      {reportIncludeItems.map(item => (
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
