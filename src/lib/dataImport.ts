import { supabase } from './supabase';

export type ImportTarget =
  | 'control_objectives'
  | 'risks'
  | 'controls'
  | 'risk_control_links'
  | 'deviations'
  | 'auditor_requests';

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
}

export interface ImportTargetConfig {
  target: ImportTarget;
  label: string;
  description: string;
  tableName: string;
  requiresActivePeriod?: boolean;
  fields: ImportField[];
  sampleRows: Record<string, string>[];
}

export interface ImportMapping {
  [fieldKey: string]: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  values: Record<string, string>;
  payload: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

export interface ImportPreview {
  target: ImportTarget;
  rows: ImportPreviewRow[];
  validRows: number;
  invalidRows: number;
}

export interface ImportContext {
  activePeriodId?: string;
}

export interface ImportResult {
  inserted: number;
  failed: number;
  errors: string[];
}

const STATUS_RISK = ['Active', 'Mitigated', 'Monitoring'];
const STATUS_CONTROL = ['Completed', 'Pending', 'Overdue'];
const FREQUENCY = ['Monthly', 'Quarterly', 'Yearly'];
const RISK_LEVEL = ['Low', 'Medium', 'High'];
const DEVIATION_SEVERITY = ['low', 'medium', 'high', 'critical'];
const DEVIATION_TYPE = ['missing_evidence', 'late_execution', 'failed_control', 'incomplete_approval', 'other'];
const DEVIATION_STATUS = ['open', 'under_remediation', 'retesting', 'closed', 'risk_accepted'];
const AUDITOR_REQUEST_STATUS = ['open', 'answered', 'accepted', 'closed'];

export const IMPORT_TARGETS: ImportTargetConfig[] = [
  {
    target: 'control_objectives',
    label: 'Control Objectives',
    description: 'Control goals, scope statements, risk areas, and evidence expectations.',
    tableName: 'control_objectives',
    fields: [
      field('title', 'Title', true, ['objective', 'objective title', 'goal', 'control objective', 'name']),
      field('description', 'Description', false, ['details', 'objective description', 'goal description']),
      field('risk_area', 'Risk area', false, ['risk area', 'domain', 'category', 'area']),
      field('evidence_requirement', 'Evidence requirement', false, ['evidence', 'evidence requirement', 'evidence required']),
      field('in_scope', 'In scope', false, ['scope', 'in scope', 'inscope']),
    ],
    sampleRows: [
      {
        title: 'Access rights are reviewed periodically',
        risk_area: 'Access',
        evidence_requirement: 'Quarterly access review export and approval record',
        in_scope: 'true',
      },
    ],
  },
  {
    target: 'risks',
    label: 'Risks',
    description: 'Risk register rows with likelihood, impact, owner, status, and optional IDs.',
    tableName: 'risks',
    fields: [
      field('id', 'Risk ID', false, ['risk id', 'risk_id', 'id']),
      field('title', 'Title', true, ['risk', 'risk title', 'name']),
      field('category', 'Category', true, ['risk category', 'domain', 'area']),
      field('likelihood', 'Likelihood', true, ['probability']),
      field('impact', 'Impact', true, ['consequence']),
      field('risk_score', 'Risk score', false, ['score', 'rating']),
      field('owner_name', 'Owner', true, ['owner', 'risk owner', 'responsible']),
      field('status', 'Status', false, ['risk status']),
      field('last_review', 'Last review', false, ['last reviewed', 'review date']),
    ],
    sampleRows: [
      {
        id: 'R101',
        title: 'Privileged access not reviewed',
        category: 'Access',
        likelihood: 'Medium',
        impact: 'High',
        owner_name: 'Security Lead',
        status: 'Active',
      },
    ],
  },
  {
    target: 'controls',
    label: 'Controls',
    description: 'Control register rows with frequency, owner, status, and optional objective link.',
    tableName: 'controls',
    fields: [
      field('id', 'Control ID', false, ['control id', 'control_id', 'id']),
      field('title', 'Title', true, ['control', 'control title', 'name']),
      field('category', 'Category', true, ['control category', 'domain', 'area']),
      field('frequency', 'Frequency', true, ['cadence', 'periodicity']),
      field('owner_name', 'Owner', true, ['owner', 'control owner', 'responsible']),
      field('status', 'Status', false, ['control status']),
      field('last_execution', 'Last execution', false, ['last performed', 'last run']),
      field('next_due', 'Next due', false, ['due date', 'next review']),
      field('description', 'Description', false, ['details']),
      field('control_objective_id', 'Objective ID', false, ['objective id', 'control_objective_id']),
    ],
    sampleRows: [
      {
        id: 'C101',
        title: 'Quarterly access review',
        category: 'Access',
        frequency: 'Quarterly',
        owner_name: 'Security Lead',
        status: 'Pending',
      },
    ],
  },
  {
    target: 'risk_control_links',
    label: 'Risk-Control Links',
    description: 'Relationship map between existing risk IDs and control IDs.',
    tableName: 'risk_controls',
    fields: [
      field('risk_id', 'Risk ID', true, ['risk id', 'risk_id']),
      field('control_id', 'Control ID', true, ['control id', 'control_id']),
    ],
    sampleRows: [{ risk_id: 'R101', control_id: 'C101' }],
  },
  {
    target: 'deviations',
    label: 'Deviations',
    description: 'Exceptions, failed controls, late executions, and remediation inputs.',
    tableName: 'deviations',
    requiresActivePeriod: true,
    fields: [
      field('control_id', 'Control ID', true, ['control id', 'control_id']),
      field('execution_id', 'Execution ID', false, ['execution id', 'execution_id']),
      field('audit_period_id', 'Audit period ID', false, ['period id', 'audit_period_id']),
      field('severity', 'Severity', false, ['rating']),
      field('type', 'Type', false, ['deviation type', 'exception type']),
      field('description', 'Description', true, ['deviation', 'exception', 'finding']),
      field('detected_date', 'Detected date', false, ['date detected', 'detected']),
      field('root_cause', 'Root cause', false, ['cause']),
      field('audit_impact', 'Audit impact', false, ['impact']),
      field('status', 'Status', false, ['deviation status']),
      field('owner_name', 'Owner', false, ['owner', 'responsible']),
    ],
    sampleRows: [
      {
        control_id: 'C101',
        severity: 'medium',
        type: 'late_execution',
        description: 'Access review completed after due date',
        owner_name: 'Security Lead',
      },
    ],
  },
  {
    target: 'auditor_requests',
    label: 'Auditor Requests',
    description: 'Auditor request list with owners, due dates, status, and responses.',
    tableName: 'auditor_requests',
    requiresActivePeriod: true,
    fields: [
      field('audit_period_id', 'Audit period ID', false, ['period id', 'audit_period_id']),
      field('auditor', 'Auditor', false, ['auditor name']),
      field('request_text', 'Request text', true, ['request', 'question', 'description']),
      field('related_control', 'Related control', false, ['control id', 'related control', 'control']),
      field('owner_name', 'Owner', false, ['owner', 'responsible']),
      field('due_date', 'Due date', false, ['deadline']),
      field('status', 'Status', false, ['request status']),
      field('response', 'Response', false, ['answer']),
      field('submitted_date', 'Submitted date', false, ['request date', 'submitted']),
    ],
    sampleRows: [
      {
        auditor: 'External auditor',
        request_text: 'Provide Q1 access review evidence',
        related_control: 'C101',
        owner_name: 'Security Lead',
        due_date: '2026-06-15',
        status: 'open',
      },
    ],
  },
];

export const IMPORT_TARGET_BY_KEY = Object.fromEntries(
  IMPORT_TARGETS.map(target => [target.target, target])
) as Record<ImportTarget, ImportTargetConfig>;

function field(key: string, label: string, required: boolean, aliases: string[]): ImportField {
  return { key, label, required, aliases: [key, label, ...aliases] };
}

export function parseDelimitedText(input: string): ParsedSheet {
  const delimiter = detectDelimiter(input);
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current.trim());
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some(cell => cell.length > 0)) rows.push(row);
  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map(normalizeHeaderLabel);
  const dataRows = rows.slice(1).map(cells => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? '';
    });
    return record;
  });

  return { headers, rows: dataRows };
}

export function buildAutoMapping(headers: string[], config: ImportTargetConfig): ImportMapping {
  const normalizedHeaders = headers.map(header => ({ raw: header, normalized: normalizeKey(header) }));
  const mapping: ImportMapping = {};

  config.fields.forEach(field => {
    const aliases = field.aliases.map(normalizeKey);
    const exact = normalizedHeaders.find(header => aliases.includes(header.normalized));
    if (exact) {
      mapping[field.key] = exact.raw;
      return;
    }

    const fuzzy = normalizedHeaders.find(header =>
      aliases.some(alias => header.normalized.includes(alias) || alias.includes(header.normalized))
    );
    if (fuzzy) mapping[field.key] = fuzzy.raw;
  });

  return mapping;
}

export function buildImportPreview(
  target: ImportTarget,
  sheet: ParsedSheet,
  mapping: ImportMapping,
  context: ImportContext = {}
): ImportPreview {
  const rows = sheet.rows.map((row, index) => {
    const values = mappedValues(row, mapping);
    const { payload, errors, warnings } = normalizePayload(target, values, context);
    return { rowNumber: index + 2, values, payload, errors, warnings };
  });

  return {
    target,
    rows,
    validRows: rows.filter(row => row.errors.length === 0).length,
    invalidRows: rows.filter(row => row.errors.length > 0).length,
  };
}

export async function runImport(preview: ImportPreview): Promise<ImportResult> {
  let validPayloads = preview.rows
    .filter(row => row.errors.length === 0)
    .map(row => row.payload);

  if (validPayloads.length === 0) {
    return { inserted: 0, failed: preview.rows.length, errors: ['No valid rows to import.'] };
  }

  validPayloads = await preparePayloads(preview.target, validPayloads);

  if (preview.target === 'risk_control_links') {
    const { error } = await supabase.from('risk_controls').upsert(validPayloads as any, {
      onConflict: 'risk_id,control_id',
    });
    return resultFromError(validPayloads.length, preview.rows.length - validPayloads.length, error?.message);
  }

  const config = IMPORT_TARGET_BY_KEY[preview.target];
  const { error } = await supabase.from(config.tableName).upsert(validPayloads as any);
  return resultFromError(validPayloads.length, preview.rows.length - validPayloads.length, error?.message);
}

async function preparePayloads(target: ImportTarget, payloads: Record<string, unknown>[]) {
  if (target === 'risks') return assignMissingTextIds('risks', 'R', payloads);
  if (target === 'controls') return assignMissingTextIds('controls', 'C', payloads);
  return payloads;
}

async function assignMissingTextIds(
  table: 'risks' | 'controls',
  prefix: 'R' | 'C',
  payloads: Record<string, unknown>[]
) {
  const missingCount = payloads.filter(payload => !payload.id).length;
  if (missingCount === 0) return payloads;

  const { data } = await supabase.from(table).select('id').order('id', { ascending: false });
  const existingNumbers = (data ?? [])
    .map(row => String(row.id ?? ''))
    .map(id => Number.parseInt(id.replace(prefix, ''), 10))
    .filter(Number.isFinite);
  let next = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  return payloads.map(payload => {
    if (payload.id) return payload;
    const id = `${prefix}${String(next).padStart(3, '0')}`;
    next += 1;
    return { ...payload, id };
  });
}

export function generateTemplateCsv(target: ImportTarget): string {
  const config = IMPORT_TARGET_BY_KEY[target];
  const headers = config.fields.map(field => field.key);
  const rows = config.sampleRows.length > 0 ? config.sampleRows : [{}];
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => csvCell(row[header] ?? '')).join(',')),
  ].join('\n');
}

export function downloadTextFile(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function detectDelimiter(input: string): ',' | '\t' | ';' {
  const firstLine = input.split(/\r?\n/)[0] ?? '';
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  if (tabs > commas && tabs >= semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

function normalizeHeaderLabel(value: string) {
  return value.trim().replace(/^\uFEFF/, '');
}

function normalizeKey(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function mappedValues(row: Record<string, string>, mapping: ImportMapping) {
  const values: Record<string, string> = {};
  Object.entries(mapping).forEach(([fieldKey, header]) => {
    values[fieldKey] = row[header]?.trim() ?? '';
  });
  return values;
}

function normalizePayload(target: ImportTarget, values: Record<string, string>, context: ImportContext) {
  const config = IMPORT_TARGET_BY_KEY[target];
  const errors: string[] = [];
  const warnings: string[] = [];

  config.fields.filter(field => field.required).forEach(field => {
    if (!values[field.key]) errors.push(`${field.label} is required.`);
  });

  if (config.requiresActivePeriod && !values.audit_period_id && !context.activePeriodId) {
    errors.push('Active audit period is required for this import.');
  }

  const payload: Record<string, unknown> = {};
  Object.entries(values).forEach(([key, value]) => {
    if (value !== '') payload[key] = value;
  });

  if (target === 'control_objectives') {
    payload.in_scope = parseBoolean(values.in_scope, true);
  }

  if (target === 'risks') {
    payload.likelihood = normalizeEnum(values.likelihood, RISK_LEVEL, 'Low');
    payload.impact = normalizeEnum(values.impact, RISK_LEVEL, 'Low');
    payload.status = normalizeEnum(values.status, STATUS_RISK, 'Active');
    payload.risk_score = values.risk_score ? Number(values.risk_score) : riskScore(payload.likelihood as string, payload.impact as string);
    payload.last_review = values.last_review || new Date().toISOString().split('T')[0];
    validateEnum(values.likelihood, RISK_LEVEL, 'Likelihood', errors);
    validateEnum(values.impact, RISK_LEVEL, 'Impact', errors);
    if (values.status) validateEnum(values.status, STATUS_RISK, 'Status', errors);
  }

  if (target === 'controls') {
    payload.frequency = normalizeEnum(values.frequency, FREQUENCY, 'Monthly');
    payload.status = normalizeEnum(values.status, STATUS_CONTROL, 'Pending');
    validateEnum(values.frequency, FREQUENCY, 'Frequency', errors);
    if (values.status) validateEnum(values.status, STATUS_CONTROL, 'Status', errors);
  }

  if (target === 'deviations') {
    payload.audit_period_id = values.audit_period_id || context.activePeriodId;
    payload.severity = normalizeEnum(values.severity, DEVIATION_SEVERITY, 'medium');
    payload.type = normalizeEnum(values.type, DEVIATION_TYPE, 'late_execution');
    payload.status = normalizeEnum(values.status, DEVIATION_STATUS, 'open');
    payload.detected_date = values.detected_date || new Date().toISOString().split('T')[0];
    if (values.severity) validateEnum(values.severity, DEVIATION_SEVERITY, 'Severity', errors);
    if (values.type) validateEnum(values.type, DEVIATION_TYPE, 'Type', errors);
    if (values.status) validateEnum(values.status, DEVIATION_STATUS, 'Status', errors);
  }

  if (target === 'auditor_requests') {
    payload.audit_period_id = values.audit_period_id || context.activePeriodId;
    payload.status = normalizeEnum(values.status, AUDITOR_REQUEST_STATUS, 'open');
    payload.submitted_date = values.submitted_date || new Date().toISOString().split('T')[0];
    if (values.status) validateEnum(values.status, AUDITOR_REQUEST_STATUS, 'Status', errors);
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (key.endsWith('_date') && value && !isIsoDate(String(value))) {
      warnings.push(`${key} should use YYYY-MM-DD.`);
    }
  });

  return { payload, errors, warnings };
}

function validateEnum(value: string, allowed: string[], label: string, errors: string[]) {
  if (!value) return;
  if (!allowed.map(v => v.toLowerCase()).includes(value.toLowerCase())) {
    errors.push(`${label} must be one of: ${allowed.join(', ')}.`);
  }
}

function normalizeEnum(value: string, allowed: string[], fallback: string) {
  if (!value) return fallback;
  const match = allowed.find(item => item.toLowerCase() === value.toLowerCase());
  return match ?? value;
}

function parseBoolean(value: string, fallback: boolean) {
  if (!value) return fallback;
  return ['true', 'yes', 'y', '1', 'in scope', 'in_scope'].includes(value.toLowerCase());
}

function riskScore(likelihood: string, impact: string) {
  const values: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
  const raw = (values[likelihood] ?? 1) * (values[impact] ?? 1);
  if (raw >= 7) return 9;
  if (raw >= 5) return 7;
  if (raw >= 3) return 5;
  return raw;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function csvCell(value: string) {
  const escaped = String(value).replace(/"/g, '""');
  return `"${escaped}"`;
}

function resultFromError(inserted: number, invalid: number, error?: string): ImportResult {
  if (error) return { inserted: 0, failed: inserted + invalid, errors: [error] };
  return { inserted, failed: invalid, errors: [] };
}
