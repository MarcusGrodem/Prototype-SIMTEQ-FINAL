import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import type { ImportRun, ImportRunRow, ImportRunStatus } from './types';

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

export interface ParsedWorkbook {
  sheetNames: string[];
  format: 'xlsx' | 'csv' | 'tsv';
  parseSheet: (name: string) => ParsedSheet;
}

export type MappingConfidence = 'exact' | 'alias' | 'fuzzy' | 'manual' | 'none';

export interface MappingSuggestion {
  fieldKey: string;
  sourceHeader: string | null;
  confidence: MappingConfidence;
  score: number;
  reason: string;
}

export interface MappingSuggestionResult {
  mapping: ImportMapping;
  suggestions: Record<string, MappingSuggestion>;
}

export type ImportMappingSuggester = (
  headers: string[],
  config: ImportTargetConfig,
  sampleRows?: Record<string, string>[]
) => MappingSuggestionResult | Promise<MappingSuggestionResult>;

export interface ImportRowTransform {
  field: string;
  original: string;
  normalized: string;
  reason: string;
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
  sourceData: Record<string, string>;
  values: Record<string, string>;
  payload: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  transforms: ImportRowTransform[];
}

export interface ImportPreview {
  target: ImportTarget;
  rows: ImportPreviewRow[];
  validRows: number;
  invalidRows: number;
  transformCount: number;
}

export interface ImportContext {
  activePeriodId?: string;
}

export interface ImportResult {
  inserted: number;
  failed: number;
  errors: string[];
}

export interface RunImportOptions {
  fileName?: string;
  importedByName?: string;
  sourceType?: string;
  sourceChecksum?: string | null;
  sourceFileSize?: number | null;
}

export async function computeFileChecksum(file: File): Promise<{ checksum: string | null; size: number }> {
  const size = file.size;
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return { checksum: null, size };
  }
  try {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const checksum = Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    return { checksum, size };
  } catch {
    return { checksum: null, size };
  }
}

const STATUS_RISK = ['Active', 'Mitigated', 'Monitoring'];
const STATUS_CONTROL = ['Completed', 'Pending', 'Overdue'];
const FREQUENCY = ['Monthly', 'Quarterly', 'Yearly'];
const RISK_LEVEL = ['Low', 'Medium', 'High'];
const DEVIATION_SEVERITY = ['low', 'medium', 'high', 'critical'];
const DEVIATION_TYPE = ['missing_evidence', 'late_execution', 'failed_control', 'incomplete_approval', 'other'];
const DEVIATION_STATUS = ['open', 'under_remediation', 'retesting', 'closed', 'risk_accepted'];
const AUDITOR_REQUEST_STATUS = ['open', 'answered', 'accepted', 'closed'];

const RISK_LEVEL_SYNONYMS: Record<string, string> = {
  low: 'Low', lo: 'Low', l: 'Low',
  med: 'Medium', medium: 'Medium', mid: 'Medium', moderate: 'Medium', m: 'Medium',
  high: 'High', hi: 'High', h: 'High', severe: 'High',
};

const FREQUENCY_SYNONYMS: Record<string, string> = {
  monthly: 'Monthly', month: 'Monthly', m: 'Monthly', '1m': 'Monthly',
  quarterly: 'Quarterly', quarter: 'Quarterly', q: 'Quarterly', 'every quarter': 'Quarterly', 'quarterly review': 'Quarterly', '3m': 'Quarterly',
  yearly: 'Yearly', annual: 'Yearly', annually: 'Yearly', year: 'Yearly', y: 'Yearly', '12m': 'Yearly',
};

const RISK_STATUS_SYNONYMS: Record<string, string> = {
  active: 'Active', open: 'Active', live: 'Active',
  mitigated: 'Mitigated', closed: 'Mitigated', resolved: 'Mitigated',
  monitoring: 'Monitoring', monitor: 'Monitoring', watch: 'Monitoring',
};

const CONTROL_STATUS_SYNONYMS: Record<string, string> = {
  completed: 'Completed', complete: 'Completed', done: 'Completed', passed: 'Completed', ok: 'Completed',
  pending: 'Pending', open: 'Pending', scheduled: 'Pending', 'in progress': 'Pending', planned: 'Pending',
  overdue: 'Overdue', late: 'Overdue', missed: 'Overdue',
};

const DEVIATION_SEVERITY_SYNONYMS: Record<string, string> = {
  low: 'low', minor: 'low',
  med: 'medium', medium: 'medium', moderate: 'medium',
  high: 'high', major: 'high',
  critical: 'critical', crit: 'critical', severe: 'critical', blocker: 'critical',
};

const DEVIATION_TYPE_SYNONYMS: Record<string, string> = {
  missing_evidence: 'missing_evidence', 'missing evidence': 'missing_evidence', 'no evidence': 'missing_evidence',
  late_execution: 'late_execution', 'late execution': 'late_execution', overdue: 'late_execution', late: 'late_execution',
  failed_control: 'failed_control', 'failed control': 'failed_control', failure: 'failed_control', failed: 'failed_control',
  incomplete_approval: 'incomplete_approval', 'incomplete approval': 'incomplete_approval', unapproved: 'incomplete_approval',
  other: 'other',
};

const DEVIATION_STATUS_SYNONYMS: Record<string, string> = {
  open: 'open', new: 'open',
  under_remediation: 'under_remediation', 'under remediation': 'under_remediation', remediation: 'under_remediation', remediating: 'under_remediation',
  retesting: 'retesting', 'in retest': 'retesting', retest: 'retesting',
  closed: 'closed', resolved: 'closed', done: 'closed',
  risk_accepted: 'risk_accepted', 'risk accepted': 'risk_accepted', accepted: 'risk_accepted',
};

const AUDITOR_REQUEST_STATUS_SYNONYMS: Record<string, string> = {
  open: 'open', new: 'open', pending: 'open',
  answered: 'answered', responded: 'answered', replied: 'answered',
  accepted: 'accepted', approved: 'accepted',
  closed: 'closed', done: 'closed', complete: 'closed',
};

const TRUE_TOKENS = ['true', 'yes', 'y', '1', 'in scope', 'in_scope', 'inscope', 'on', 'enabled'];
const FALSE_TOKENS = ['false', 'no', 'n', '0', 'out of scope', 'out_of_scope', 'off', 'disabled'];

export const IMPORT_TARGETS: ImportTargetConfig[] = [
  {
    target: 'control_objectives',
    label: 'Control Objectives',
    description: 'Control goals, scope statements, risk areas, and evidence expectations.',
    tableName: 'control_objectives',
    fields: [
      field('title', 'Title', true, ['objective', 'objective title', 'goal', 'control objective', 'name', 'objective name']),
      field('description', 'Description', false, ['details', 'objective description', 'goal description', 'summary']),
      field('risk_area', 'Risk area', false, ['risk area', 'domain', 'category', 'area', 'risk domain']),
      field('evidence_requirement', 'Evidence requirement', false, ['evidence', 'evidence requirement', 'evidence required', 'required evidence']),
      field('in_scope', 'In scope', false, ['scope', 'in scope', 'inscope', 'is in scope']),
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
      field('id', 'Risk ID', false, ['risk id', 'risk_id', 'id', 'risk ref', 'reference', 'risk reference']),
      field('title', 'Title', true, ['risk', 'risk title', 'name', 'risk name', 'risk description']),
      field('category', 'Category', true, ['risk category', 'domain', 'area', 'risk area']),
      field('likelihood', 'Likelihood', true, ['probability', 'probability rating', 'likelihood rating']),
      field('impact', 'Impact', true, ['consequence', 'impact rating', 'severity']),
      field('risk_score', 'Risk score', false, ['score', 'rating', 'risk rating']),
      field('owner_name', 'Owner', true, ['owner', 'risk owner', 'responsible', 'risk responsible', 'accountable']),
      field('status', 'Status', false, ['risk status', 'state']),
      field('last_review', 'Last review', false, ['last reviewed', 'review date', 'last review date']),
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
      field('id', 'Control ID', false, ['control id', 'control_id', 'id', 'control ref', 'control reference', 'reference']),
      field('title', 'Title', true, ['control', 'control title', 'name', 'control name', 'control description']),
      field('category', 'Category', true, ['control category', 'domain', 'area', 'control area']),
      field('frequency', 'Frequency', true, ['cadence', 'periodicity', 'review frequency', 'review cadence']),
      field('owner_name', 'Owner', true, ['owner', 'control owner', 'responsible', 'accountable']),
      field('status', 'Status', false, ['control status', 'state']),
      field('last_execution', 'Last execution', false, ['last performed', 'last run', 'last executed']),
      field('next_due', 'Next due', false, ['due date', 'next review', 'due', 'next due date']),
      field('description', 'Description', false, ['details', 'summary']),
      field('control_objective_id', 'Objective ID', false, ['objective id', 'control_objective_id', 'objective ref', 'objective reference']),
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
      field('risk_id', 'Risk ID', true, ['risk id', 'risk_id', 'risk ref']),
      field('control_id', 'Control ID', true, ['control id', 'control_id', 'control ref']),
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
      field('control_id', 'Control ID', true, ['control id', 'control_id', 'control ref', 'related control']),
      field('execution_id', 'Execution ID', false, ['execution id', 'execution_id', 'run id']),
      field('audit_period_id', 'Audit period ID', false, ['period id', 'audit_period_id']),
      field('severity', 'Severity', false, ['rating', 'severity rating']),
      field('type', 'Type', false, ['deviation type', 'exception type', 'finding type']),
      field('description', 'Description', true, ['deviation', 'exception', 'finding', 'observation', 'issue', 'details']),
      field('detected_date', 'Detected date', false, ['date detected', 'detected', 'date raised', 'raised on']),
      field('root_cause', 'Root cause', false, ['cause', 'reason']),
      field('audit_impact', 'Audit impact', false, ['impact', 'audit consequence']),
      field('status', 'Status', false, ['deviation status', 'state']),
      field('owner_name', 'Owner', false, ['owner', 'responsible', 'assigned to', 'assignee']),
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
      field('auditor', 'Auditor', false, ['auditor name', 'requested by', 'firm']),
      field('request_text', 'Request text', true, ['request', 'question', 'description', 'audit request', 'auditor request', 'ask', 'pbc item', 'pbc']),
      field('related_control', 'Related control', false, ['control id', 'related control', 'control', 'control ref']),
      field('owner_name', 'Owner', false, ['owner', 'responsible', 'assigned to', 'assignee']),
      field('due_date', 'Due date', false, ['deadline', 'due', 'response due', 'reply by']),
      field('status', 'Status', false, ['request status', 'state']),
      field('response', 'Response', false, ['answer', 'reply']),
      field('submitted_date', 'Submitted date', false, ['request date', 'submitted', 'received on', 'date received']),
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

export async function parseWorkbookFile(file: File): Promise<ParsedWorkbook> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetNames = workbook.SheetNames.filter(name => Boolean(workbook.Sheets[name]));
    return {
      sheetNames,
      format: 'xlsx',
      parseSheet: (name: string) => parseXlsxSheet(workbook, name),
    };
  }

  const text = await file.text();
  const parsed = parseDelimitedText(text);
  const format = detectDelimiter(text) === '\t' ? 'tsv' : 'csv';
  return {
    sheetNames: ['Sheet 1'],
    format,
    parseSheet: () => parsed,
  };
}

function parseXlsxSheet(workbook: XLSX.WorkBook, sheetName: string): ParsedSheet {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (grid.length === 0) return { headers: [], rows: [] };

  const rawHeaders = (grid[0] as unknown[]).map(cell => normalizeHeaderLabel(stringifyCell(cell)));
  const headers = dedupeHeaders(rawHeaders);

  const rows = grid.slice(1)
    .filter(row => Array.isArray(row) && row.some(cell => stringifyCell(cell).trim().length > 0))
    .map(row => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = stringifyCell((row as unknown[])[index] ?? '').trim();
      });
      return record;
    });

  return { headers, rows };
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value);
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header || `column_${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
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

  const headers = dedupeHeaders(rows[0].map(normalizeHeaderLabel));
  const dataRows = rows.slice(1).map(cells => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? '';
    });
    return record;
  });

  return { headers, rows: dataRows };
}

/**
 * Deterministic, rule-based mapping suggester.
 *
 * The signature is intentionally compatible with `ImportMappingSuggester` so it
 * can be swapped for an AI-backed implementation later without changing
 * call-sites in the UI.
 */
export const suggestImportMapping: ImportMappingSuggester = (headers, config) => {
  const candidates: Array<{
    fieldKey: string;
    header: string;
    score: number;
    confidence: MappingConfidence;
    reason: string;
  }> = [];

  const normalizedHeaders = headers.map(header => ({
    raw: header,
    normalized: normalizeKey(header),
    tokens: tokenize(header),
  }));

  config.fields.forEach(field => {
    const aliasSet = field.aliases.map(normalizeKey);
    const aliasTokens = field.aliases.map(tokenize);

    normalizedHeaders.forEach(header => {
      if (aliasSet.includes(header.normalized)) {
        candidates.push({
          fieldKey: field.key,
          header: header.raw,
          score: 1,
          confidence: 'exact',
          reason: 'Exact column name match',
        });
        return;
      }

      const containsAlias = aliasSet.find(alias =>
        alias.length > 2 && (header.normalized.includes(alias) || alias.includes(header.normalized))
      );
      if (containsAlias) {
        candidates.push({
          fieldKey: field.key,
          header: header.raw,
          score: 0.8,
          confidence: 'alias',
          reason: `Matched alias "${containsAlias.replace(/_/g, ' ')}"`,
        });
        return;
      }

      const tokenScore = bestTokenScore(header.tokens, aliasTokens);
      if (tokenScore >= 0.5) {
        candidates.push({
          fieldKey: field.key,
          header: header.raw,
          score: tokenScore,
          confidence: 'fuzzy',
          reason: 'Shared keywords with field name',
        });
      }
    });
  });

  candidates.sort((a, b) => b.score - a.score);

  const mapping: ImportMapping = {};
  const suggestions: Record<string, MappingSuggestion> = {};
  const usedHeaders = new Set<string>();
  const usedFields = new Set<string>();

  for (const candidate of candidates) {
    if (usedFields.has(candidate.fieldKey) || usedHeaders.has(candidate.header)) continue;
    mapping[candidate.fieldKey] = candidate.header;
    suggestions[candidate.fieldKey] = {
      fieldKey: candidate.fieldKey,
      sourceHeader: candidate.header,
      confidence: candidate.confidence,
      score: candidate.score,
      reason: candidate.reason,
    };
    usedFields.add(candidate.fieldKey);
    usedHeaders.add(candidate.header);
  }

  config.fields.forEach(field => {
    if (!suggestions[field.key]) {
      suggestions[field.key] = {
        fieldKey: field.key,
        sourceHeader: null,
        confidence: 'none',
        score: 0,
        reason: 'No matching column found',
      };
    }
  });

  return { mapping, suggestions };
};

/**
 * Backwards-compatible helper. New code should prefer `suggestImportMapping`
 * so confidence metadata flows through to the UI.
 */
export function buildAutoMapping(headers: string[], config: ImportTargetConfig): ImportMapping {
  const result = suggestImportMapping(headers, config);
  if (typeof (result as Promise<MappingSuggestionResult>).then === 'function') return {};
  return (result as MappingSuggestionResult).mapping;
}

const STOP_TOKENS = new Set(['the', 'of', 'and', 'a', 'an', 'to', 'for']);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length > 1 && !STOP_TOKENS.has(token));
}

function bestTokenScore(headerTokens: string[], aliasTokensList: string[][]): number {
  if (headerTokens.length === 0) return 0;
  let best = 0;
  for (const aliasTokens of aliasTokensList) {
    if (aliasTokens.length === 0) continue;
    const shared = aliasTokens.filter(token => headerTokens.includes(token)).length;
    if (shared === 0) continue;
    const denom = Math.max(headerTokens.length, aliasTokens.length);
    const score = shared / denom;
    if (score > best) best = score;
  }
  return best;
}

export function buildImportPreview(
  target: ImportTarget,
  sheet: ParsedSheet,
  mapping: ImportMapping,
  context: ImportContext = {}
): ImportPreview {
  const rows = sheet.rows.map((row, index) => {
    const values = mappedValues(row, mapping);
    const { payload, errors, warnings, transforms } = normalizePayload(target, values, context);
    return { rowNumber: index + 2, sourceData: row, values, payload, errors, warnings, transforms };
  });

  return {
    target,
    rows,
    validRows: rows.filter(row => row.errors.length === 0).length,
    invalidRows: rows.filter(row => row.errors.length > 0).length,
    transformCount: rows.reduce((count, row) => count + row.transforms.length, 0),
  };
}

export async function runImport(
  preview: ImportPreview,
  options: RunImportOptions = {}
): Promise<ImportResult> {
  const rowCount = preview.rows.length;
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from('import_runs')
    .insert({
      target: preview.target,
      file_name: options.fileName ?? null,
      source_type: options.sourceType ?? 'csv_tsv',
      source_checksum: options.sourceChecksum ?? null,
      source_file_size: options.sourceFileSize ?? null,
      row_count: rowCount,
      success_count: 0,
      failure_count: 0,
      status: 'running',
      imported_by_name: options.importedByName ?? null,
      started_at: startedAt,
    })
    .select('id')
    .single();

  if (runError || !run) {
    return {
      inserted: 0,
      failed: rowCount,
      errors: [`Could not create import run: ${runError?.message ?? 'unknown error'}`],
    };
  }

  const rowResults = new Map<number, { status: 'success' | 'failed'; payload: Record<string, unknown>; errorMessage: string | null }>();
  const validRows = preview.rows.filter(row => row.errors.length === 0);
  const invalidRows = preview.rows.filter(row => row.errors.length > 0);
  let dbErrors: string[] = [];

  invalidRows.forEach(row => {
    rowResults.set(row.rowNumber, {
      status: 'failed',
      payload: row.payload,
      errorMessage: row.errors.join(' '),
    });
  });

  const validPayloads = await preparePayloads(preview.target, validRows.map(row => row.payload));

  for (let index = 0; index < validRows.length; index += 1) {
    const row = validRows[index];
    const payload = validPayloads[index];
    const error = await upsertImportPayload(preview.target, payload);

    if (error) {
      const message = `Row ${row.rowNumber}: ${error}`;
      dbErrors.push(message);
      rowResults.set(row.rowNumber, { status: 'failed', payload, errorMessage: error });
    } else {
      rowResults.set(row.rowNumber, { status: 'success', payload, errorMessage: null });
    }
  }

  const rowLogs = preview.rows.map(row => {
    const result = rowResults.get(row.rowNumber) ?? {
      status: 'failed' as const,
      payload: row.payload,
      errorMessage: 'Row was not processed.',
    };

    return {
      import_run_id: run.id,
      row_number: row.rowNumber,
      status: result.status,
      source_data: row.sourceData,
      payload: result.payload,
      transforms: row.transforms,
      error_message: result.errorMessage,
    };
  });

  if (rowLogs.length > 0) {
    const { error: rowsError } = await supabase.from('import_run_rows').insert(rowLogs as any);
    if (rowsError) dbErrors = [...dbErrors, `Could not record import row results: ${rowsError.message}`];
  }

  const successCount = rowLogs.filter(row => row.status === 'success').length;
  const failureCount = rowLogs.length - successCount;
  const status = importRunStatus(successCount, failureCount, dbErrors.length);
  const { error: updateError } = await supabase
    .from('import_runs')
    .update({
      success_count: successCount,
      failure_count: failureCount,
      status,
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.id);

  if (updateError) dbErrors = [...dbErrors, `Could not finalize import run: ${updateError.message}`];

  return { inserted: successCount, failed: failureCount, errors: dbErrors };
}

export async function fetchImportRuns(limit = 8): Promise<ImportRun[]> {
  const { data, error } = await supabase
    .from('import_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ImportRun[];
}

export async function fetchImportRunRows(importRunId: string, status?: 'success' | 'failed'): Promise<ImportRunRow[]> {
  let query = supabase
    .from('import_run_rows')
    .select('*')
    .eq('import_run_id', importRunId);

  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('row_number', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ImportRunRow[];
}

async function upsertImportPayload(target: ImportTarget, payload: Record<string, unknown>): Promise<string | null> {
  if (target === 'risk_control_links') {
    const { error } = await supabase.from('risk_controls').upsert(payload as any, {
      onConflict: 'risk_id,control_id',
    });
    return error?.message ?? null;
  }

  const config = IMPORT_TARGET_BY_KEY[target];
  const { error } = await supabase.from(config.tableName).upsert(payload as any);
  return error?.message ?? null;
}

function importRunStatus(successCount: number, failureCount: number, dbErrorCount: number): ImportRunStatus {
  if (successCount === 0 && (failureCount > 0 || dbErrorCount > 0)) return 'failed';
  if (failureCount > 0 || dbErrorCount > 0) return 'completed_with_errors';
  return 'completed';
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

interface NormalizationResult {
  payload: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  transforms: ImportRowTransform[];
}

function normalizePayload(target: ImportTarget, values: Record<string, string>, context: ImportContext): NormalizationResult {
  const config = IMPORT_TARGET_BY_KEY[target];
  const errors: string[] = [];
  const warnings: string[] = [];
  const transforms: ImportRowTransform[] = [];

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

  // Date normalization first so explicit setters below don't trigger warnings.
  Object.entries(payload).forEach(([key, value]) => {
    if (!isDateField(key)) return;
    const original = String(value);
    const normalized = normalizeDateString(original);
    if (normalized && normalized !== original) {
      payload[key] = normalized;
      transforms.push({ field: key, original, normalized, reason: 'Date reformatted to YYYY-MM-DD' });
    } else if (!normalized) {
      warnings.push(`${key} should use YYYY-MM-DD.`);
    }
  });

  if (target === 'control_objectives') {
    const original = values.in_scope ?? '';
    const parsed = parseBoolean(original, true);
    payload.in_scope = parsed;
    if (original && original.toLowerCase() !== String(parsed).toLowerCase()) {
      transforms.push({ field: 'in_scope', original, normalized: String(parsed), reason: 'Interpreted as boolean' });
    }
  }

  if (target === 'risks') {
    applyEnumTransform('likelihood', values.likelihood, RISK_LEVEL, RISK_LEVEL_SYNONYMS, 'Low', payload, transforms, errors, true);
    applyEnumTransform('impact', values.impact, RISK_LEVEL, RISK_LEVEL_SYNONYMS, 'Low', payload, transforms, errors, true);
    applyEnumTransform('status', values.status, STATUS_RISK, RISK_STATUS_SYNONYMS, 'Active', payload, transforms, errors, false);

    if (values.risk_score) {
      const numeric = Number(values.risk_score);
      if (!Number.isFinite(numeric)) {
        errors.push('Risk score must be a number.');
      } else {
        payload.risk_score = numeric;
      }
    } else {
      const computed = riskScore(payload.likelihood as string, payload.impact as string);
      payload.risk_score = computed;
      transforms.push({ field: 'risk_score', original: '', normalized: String(computed), reason: 'Computed from likelihood × impact' });
    }
    if (!values.last_review) {
      const today = new Date().toISOString().split('T')[0];
      payload.last_review = today;
      transforms.push({ field: 'last_review', original: '', normalized: today, reason: 'Defaulted to today' });
    }
  }

  if (target === 'controls') {
    applyEnumTransform('frequency', values.frequency, FREQUENCY, FREQUENCY_SYNONYMS, 'Monthly', payload, transforms, errors, true);
    applyEnumTransform('status', values.status, STATUS_CONTROL, CONTROL_STATUS_SYNONYMS, 'Pending', payload, transforms, errors, false);
  }

  if (target === 'deviations') {
    if (!values.audit_period_id && context.activePeriodId) {
      payload.audit_period_id = context.activePeriodId;
      transforms.push({ field: 'audit_period_id', original: '', normalized: context.activePeriodId, reason: 'Filled from active audit period' });
    }
    applyEnumTransform('severity', values.severity, DEVIATION_SEVERITY, DEVIATION_SEVERITY_SYNONYMS, 'medium', payload, transforms, errors, false);
    applyEnumTransform('type', values.type, DEVIATION_TYPE, DEVIATION_TYPE_SYNONYMS, 'late_execution', payload, transforms, errors, false);
    applyEnumTransform('status', values.status, DEVIATION_STATUS, DEVIATION_STATUS_SYNONYMS, 'open', payload, transforms, errors, false);
    if (!values.detected_date) {
      const today = new Date().toISOString().split('T')[0];
      payload.detected_date = today;
      transforms.push({ field: 'detected_date', original: '', normalized: today, reason: 'Defaulted to today' });
    }
  }

  if (target === 'auditor_requests') {
    if (!values.audit_period_id && context.activePeriodId) {
      payload.audit_period_id = context.activePeriodId;
      transforms.push({ field: 'audit_period_id', original: '', normalized: context.activePeriodId, reason: 'Filled from active audit period' });
    }
    applyEnumTransform('status', values.status, AUDITOR_REQUEST_STATUS, AUDITOR_REQUEST_STATUS_SYNONYMS, 'open', payload, transforms, errors, false);
    if (!values.submitted_date) {
      const today = new Date().toISOString().split('T')[0];
      payload.submitted_date = today;
      transforms.push({ field: 'submitted_date', original: '', normalized: today, reason: 'Defaulted to today' });
    }
  }

  return { payload, errors, warnings, transforms };
}

function applyEnumTransform(
  fieldKey: string,
  rawValue: string | undefined,
  allowed: string[],
  synonyms: Record<string, string>,
  fallback: string,
  payload: Record<string, unknown>,
  transforms: ImportRowTransform[],
  errors: string[],
  required: boolean
) {
  const raw = (rawValue ?? '').trim();
  if (!raw) {
    payload[fieldKey] = fallback;
    transforms.push({ field: fieldKey, original: '', normalized: fallback, reason: `Defaulted to "${fallback}"` });
    return;
  }
  const normalized = normalizeWithSynonyms(raw, allowed, synonyms);
  if (!normalized) {
    if (required || raw) {
      errors.push(`${labelize(fieldKey)} must be one of: ${allowed.join(', ')}.`);
    }
    payload[fieldKey] = raw;
    return;
  }
  payload[fieldKey] = normalized;
  if (normalized !== raw) {
    transforms.push({ field: fieldKey, original: raw, normalized, reason: `Mapped "${raw}" to "${normalized}"` });
  }
}

function normalizeWithSynonyms(value: string, allowed: string[], synonyms: Record<string, string>): string | null {
  const lower = value.toLowerCase().trim();
  const direct = allowed.find(item => item.toLowerCase() === lower);
  if (direct) return direct;
  const synonymMatch = synonyms[lower];
  if (synonymMatch && allowed.includes(synonymMatch)) return synonymMatch;
  // Loose token contains: e.g. "quarterly review" → "Quarterly".
  const partial = allowed.find(item => lower.includes(item.toLowerCase()) || item.toLowerCase().includes(lower));
  if (partial) return partial;
  return null;
}

function parseBoolean(value: string, fallback: boolean) {
  if (!value) return fallback;
  const lower = value.toLowerCase().trim();
  if (TRUE_TOKENS.includes(lower)) return true;
  if (FALSE_TOKENS.includes(lower)) return false;
  return fallback;
}

function riskScore(likelihood: string, impact: string) {
  const values: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
  const raw = (values[likelihood] ?? 1) * (values[impact] ?? 1);
  if (raw >= 7) return 9;
  if (raw >= 5) return 7;
  if (raw >= 3) return 5;
  return raw;
}

function isDateField(key: string) {
  return key.endsWith('_date') || key === 'last_review' || key === 'last_execution' || key === 'next_due';
}

function normalizeDateString(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slashMatch = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    const numA = Number(a);
    const numB = Number(b);
    let day: number;
    let month: number;
    if (numA > 12) { day = numA; month = numB; }
    else if (numB > 12) { month = numA; day = numB; }
    else { day = numA; month = numB; }
    let yearNum = Number(year);
    if (year.length === 2) yearNum += yearNum >= 70 ? 1900 : 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${yearNum}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

function labelize(key: string) {
  return key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

function csvCell(value: string) {
  const escaped = String(value).replace(/"/g, '""');
  return `"${escaped}"`;
}
