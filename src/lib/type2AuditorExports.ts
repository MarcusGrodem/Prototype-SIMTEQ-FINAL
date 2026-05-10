import { supabase } from './supabase'
import type {
  AuditPeriod,
  Control,
  ControlExecution,
  Deviation,
  Document,
  DocumentLink,
  RemediationAction,
} from './types'

type CsvValue = string | number | boolean | null | undefined
type CsvRow = Record<string, CsvValue>

export interface ControlPopulationCsvRow extends CsvRow {
  control_id: string
  control_name: string
  owner: string
  frequency: string
  audit_period_id: string
  scheduled_due_date: string
  performed_date: string
  execution_status: string
  reviewer_status: string
  evidence_count: number
  approved_evidence_count: number
}

export interface EvidenceIndexCsvRow extends CsvRow {
  document_id: string
  document_name: string
  control_id: string
  execution_id: string
  scheduled_due_date: string
  performed_date: string
  uploaded_date: string
  reviewer_status: string
  reviewed_by_name: string
  reviewed_date: string
  reviewer_comment: string
}

export interface DeviationSummaryCsvRow extends CsvRow {
  deviation_id: string
  control_id: string
  execution_id: string
  severity: string
  type: string
  status: string
  owner_name: string
  detected_date: string
  root_cause: string
  audit_impact: string
  remediation_status: string
  remediation_owner: string
  remediation_due_date: string
  remediation_closed_date: string
  retest_required: boolean
  retest_result: string
}

export interface Type2AuditorExport<T extends CsvRow = CsvRow> {
  filename: string
  csv: string
  rows: T[]
}

export interface Type2AuditorExportPack {
  controlPopulation: Type2AuditorExport<ControlPopulationCsvRow>
  evidenceIndex: Type2AuditorExport<EvidenceIndexCsvRow>
  deviationSummary: Type2AuditorExport<DeviationSummaryCsvRow>
}

const CONTROL_POPULATION_HEADERS = [
  'control_id',
  'control_name',
  'owner',
  'frequency',
  'audit_period_id',
  'scheduled_due_date',
  'performed_date',
  'execution_status',
  'reviewer_status',
  'evidence_count',
  'approved_evidence_count',
]

const EVIDENCE_INDEX_HEADERS = [
  'document_id',
  'document_name',
  'control_id',
  'execution_id',
  'scheduled_due_date',
  'performed_date',
  'uploaded_date',
  'reviewer_status',
  'reviewed_by_name',
  'reviewed_date',
  'reviewer_comment',
]

const DEVIATION_SUMMARY_HEADERS = [
  'deviation_id',
  'control_id',
  'execution_id',
  'severity',
  'type',
  'status',
  'owner_name',
  'detected_date',
  'root_cause',
  'audit_impact',
  'remediation_status',
  'remediation_owner',
  'remediation_due_date',
  'remediation_closed_date',
  'retest_required',
  'retest_result',
]

type ControlLookup = Pick<Control, 'id' | 'title' | 'owner_name' | 'frequency'>
type DocumentLinkLookup = Pick<DocumentLink, 'document_id' | 'execution_id'>
type DocumentLookup = Pick<
  Document,
  | 'id'
  | 'name'
  | 'created_at'
  | 'reviewer_status'
  | 'reviewed_by_name'
  | 'reviewed_date'
  | 'reviewer_comment'
>
type RemediationLookup = Pick<
  RemediationAction,
  | 'deviation_id'
  | 'owner_name'
  | 'due_date'
  | 'closed_date'
  | 'retest_required'
  | 'retest_result'
  | 'status'
  | 'created_at'
>

type ExecutionEvidenceCounts = {
  evidenceCount: number
  approvedEvidenceCount: number
}

const getToday = () => new Date().toISOString().split('T')[0]

const toMap = <T,>(rows: T[], getKey: (row: T) => string) =>
  new Map(rows.map(row => [getKey(row), row]))

const sanitizeFilenamePart = (value: string) =>
  value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80)

const assertNoError = (error: { message?: string } | null, context: string) => {
  if (error) throw new Error(`${context}: ${error.message ?? 'Supabase request failed'}`)
}

function normalizeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function escapeCsvCell(value: CsvValue): string {
  let text = normalizeCsvValue(value)

  // Prevent spreadsheet formula execution for free-text auditor export fields.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`

  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function buildCsv(headers: string[], rows: CsvRow[]): string {
  const headerLine = headers.map(escapeCsvCell).join(',')
  const body = rows.map(row => headers.map(header => escapeCsvCell(row[header])).join(','))
  return [headerLine, ...body].join('\n')
}

export function downloadCsvContent(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function fetchExecutionsForPeriod(auditPeriodId: string): Promise<ControlExecution[]> {
  const { data, error } = await supabase
    .from('control_executions')
    .select('*')
    .eq('audit_period_id', auditPeriodId)
    .order('scheduled_due_date', { ascending: true })
    .order('control_id', { ascending: true })

  assertNoError(error, 'Could not fetch control executions')
  return (data as ControlExecution[]) ?? []
}

async function fetchControlsById(controlIds: string[]): Promise<Map<string, ControlLookup>> {
  if (controlIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('controls')
    .select('id, title, owner_name, frequency')
    .in('id', controlIds)

  assertNoError(error, 'Could not fetch controls')
  return toMap((data as ControlLookup[]) ?? [], row => row.id)
}

async function fetchDocumentLinksByExecutionId(executionIds: string[]): Promise<DocumentLinkLookup[]> {
  if (executionIds.length === 0) return []

  const { data, error } = await supabase
    .from('document_links')
    .select('document_id, execution_id')
    .in('execution_id', executionIds)

  assertNoError(error, 'Could not fetch execution evidence links')
  return ((data as DocumentLinkLookup[]) ?? []).filter(link => Boolean(link.execution_id))
}

async function fetchDocumentsById(documentIds: string[]): Promise<Map<string, DocumentLookup>> {
  if (documentIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('documents')
    .select('id, name, created_at, reviewer_status, reviewed_by_name, reviewed_date, reviewer_comment')
    .in('id', documentIds)

  assertNoError(error, 'Could not fetch evidence documents')
  return toMap((data as DocumentLookup[]) ?? [], row => row.id)
}

function buildExecutionEvidenceCounts(
  documentLinks: DocumentLinkLookup[],
  documentsById: Map<string, DocumentLookup>
): Map<string, ExecutionEvidenceCounts> {
  const documentIdsByExecution = new Map<string, Set<string>>()

  documentLinks.forEach(link => {
    if (!link.execution_id) return
    const documentIds = documentIdsByExecution.get(link.execution_id) ?? new Set<string>()
    documentIds.add(link.document_id)
    documentIdsByExecution.set(link.execution_id, documentIds)
  })

  return new Map(
    Array.from(documentIdsByExecution.entries()).map(([executionId, documentIds]) => {
      const approvedEvidenceCount = Array.from(documentIds).filter(documentId =>
        documentsById.get(documentId)?.reviewer_status === 'approved'
      ).length

      return [executionId, { evidenceCount: documentIds.size, approvedEvidenceCount }]
    })
  )
}

export async function fetchControlPopulationRows(auditPeriodId: string): Promise<ControlPopulationCsvRow[]> {
  const executions = await fetchExecutionsForPeriod(auditPeriodId)
  const controlIds = Array.from(new Set(executions.map(execution => execution.control_id)))
  const executionIds = executions.map(execution => execution.id)

  const [controlsById, documentLinks] = await Promise.all([
    fetchControlsById(controlIds),
    fetchDocumentLinksByExecutionId(executionIds),
  ])

  const documentIds = Array.from(new Set(documentLinks.map(link => link.document_id)))
  const documentsById = await fetchDocumentsById(documentIds)
  const evidenceCountsByExecution = buildExecutionEvidenceCounts(documentLinks, documentsById)

  return executions.map(execution => {
    const control = controlsById.get(execution.control_id)
    const counts = evidenceCountsByExecution.get(execution.id)

    return {
      control_id: execution.control_id,
      control_name: control?.title ?? '',
      owner: control?.owner_name ?? '',
      frequency: control?.frequency ?? '',
      audit_period_id: execution.audit_period_id,
      scheduled_due_date: execution.scheduled_due_date,
      performed_date: execution.performed_date ?? '',
      execution_status: execution.status,
      reviewer_status: execution.reviewer_status,
      evidence_count: counts?.evidenceCount ?? 0,
      approved_evidence_count: counts?.approvedEvidenceCount ?? 0,
    }
  })
}

export function buildControlPopulationCsv(rows: ControlPopulationCsvRow[]): string {
  return buildCsv(CONTROL_POPULATION_HEADERS, rows)
}

export async function generateControlPopulationCsv(auditPeriodId: string): Promise<string> {
  return buildControlPopulationCsv(await fetchControlPopulationRows(auditPeriodId))
}

export async function fetchEvidenceIndexRows(auditPeriodId: string): Promise<EvidenceIndexCsvRow[]> {
  const executions = await fetchExecutionsForPeriod(auditPeriodId)
  const executionsById = toMap(executions, execution => execution.id)
  const documentLinks = await fetchDocumentLinksByExecutionId(executions.map(execution => execution.id))
  const documentsById = await fetchDocumentsById(Array.from(new Set(documentLinks.map(link => link.document_id))))

  return documentLinks
    .map(link => {
      const execution = link.execution_id ? executionsById.get(link.execution_id) : undefined
      const document = documentsById.get(link.document_id)
      if (!execution || !document) return null

      return {
        document_id: document.id,
        document_name: document.name,
        control_id: execution.control_id,
        execution_id: execution.id,
        scheduled_due_date: execution.scheduled_due_date,
        performed_date: execution.performed_date ?? '',
        uploaded_date: document.created_at,
        reviewer_status: document.reviewer_status,
        reviewed_by_name: document.reviewed_by_name ?? '',
        reviewed_date: document.reviewed_date ?? '',
        reviewer_comment: document.reviewer_comment ?? '',
      }
    })
    .filter((row): row is EvidenceIndexCsvRow => row !== null)
}

export function buildEvidenceIndexCsv(rows: EvidenceIndexCsvRow[]): string {
  return buildCsv(EVIDENCE_INDEX_HEADERS, rows)
}

export async function generateEvidenceIndexCsv(auditPeriodId: string): Promise<string> {
  return buildEvidenceIndexCsv(await fetchEvidenceIndexRows(auditPeriodId))
}

async function fetchDeviationsForPeriod(auditPeriodId: string): Promise<Deviation[]> {
  const { data, error } = await supabase
    .from('deviations')
    .select('*')
    .eq('audit_period_id', auditPeriodId)
    .order('detected_date', { ascending: true })
    .order('created_at', { ascending: true })

  assertNoError(error, 'Could not fetch deviations')
  return (data as Deviation[]) ?? []
}

async function fetchLatestRemediationByDeviationId(
  deviationIds: string[]
): Promise<Map<string, RemediationLookup>> {
  if (deviationIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('remediation_actions')
    .select('deviation_id, owner_name, due_date, closed_date, retest_required, retest_result, status, created_at')
    .in('deviation_id', deviationIds)
    .order('created_at', { ascending: false })

  assertNoError(error, 'Could not fetch remediation actions')

  const latestByDeviationId = new Map<string, RemediationLookup>()
  ;((data as RemediationLookup[]) ?? []).forEach(remediation => {
    if (!latestByDeviationId.has(remediation.deviation_id)) {
      latestByDeviationId.set(remediation.deviation_id, remediation)
    }
  })

  return latestByDeviationId
}

export async function fetchDeviationSummaryRows(auditPeriodId: string): Promise<DeviationSummaryCsvRow[]> {
  const deviations = await fetchDeviationsForPeriod(auditPeriodId)
  const remediationsByDeviationId = await fetchLatestRemediationByDeviationId(
    deviations.map(deviation => deviation.id)
  )

  return deviations.map(deviation => {
    const remediation = remediationsByDeviationId.get(deviation.id)

    return {
      deviation_id: deviation.id,
      control_id: deviation.control_id,
      execution_id: deviation.execution_id ?? '',
      severity: deviation.severity,
      type: deviation.type,
      status: deviation.status,
      owner_name: deviation.owner_name ?? '',
      detected_date: deviation.detected_date,
      root_cause: deviation.root_cause ?? '',
      audit_impact: deviation.audit_impact ?? '',
      remediation_status: remediation?.status ?? '',
      remediation_owner: remediation?.owner_name ?? '',
      remediation_due_date: remediation?.due_date ?? '',
      remediation_closed_date: remediation?.closed_date ?? '',
      retest_required: remediation?.retest_required ?? false,
      retest_result: remediation?.retest_result ?? '',
    }
  })
}

export function buildDeviationSummaryCsv(rows: DeviationSummaryCsvRow[]): string {
  return buildCsv(DEVIATION_SUMMARY_HEADERS, rows)
}

export async function generateDeviationSummaryCsv(auditPeriodId: string): Promise<string> {
  return buildDeviationSummaryCsv(await fetchDeviationSummaryRows(auditPeriodId))
}

export function getType2AuditorExportFilename(
  auditPeriodIdOrName: string,
  exportName: 'control_population' | 'evidence_index' | 'deviation_summary'
): string {
  const safePeriod = sanitizeFilenamePart(auditPeriodIdOrName)
  return `type2_${exportName}_${safePeriod}_${getToday()}.csv`
}

export async function generateType2AuditorExportPack(
  auditPeriodId: string,
  filenamePeriodName = auditPeriodId
): Promise<Type2AuditorExportPack> {
  const [controlPopulationRows, evidenceIndexRows, deviationSummaryRows] = await Promise.all([
    fetchControlPopulationRows(auditPeriodId),
    fetchEvidenceIndexRows(auditPeriodId),
    fetchDeviationSummaryRows(auditPeriodId),
  ])

  return {
    controlPopulation: {
      filename: getType2AuditorExportFilename(filenamePeriodName, 'control_population'),
      csv: buildControlPopulationCsv(controlPopulationRows),
      rows: controlPopulationRows,
    },
    evidenceIndex: {
      filename: getType2AuditorExportFilename(filenamePeriodName, 'evidence_index'),
      csv: buildEvidenceIndexCsv(evidenceIndexRows),
      rows: evidenceIndexRows,
    },
    deviationSummary: {
      filename: getType2AuditorExportFilename(filenamePeriodName, 'deviation_summary'),
      csv: buildDeviationSummaryCsv(deviationSummaryRows),
      rows: deviationSummaryRows,
    },
  }
}

export async function exportControlPopulationCsv(period: AuditPeriod) {
  const rows = await fetchControlPopulationRows(period.id)
  downloadCsvContent(
    buildControlPopulationCsv(rows),
    getType2AuditorExportFilename(getAuditPeriodFilenamePart(period), 'control_population')
  )
}

export async function exportEvidenceIndexCsv(period: AuditPeriod) {
  const rows = await fetchEvidenceIndexRows(period.id)
  downloadCsvContent(
    buildEvidenceIndexCsv(rows),
    getType2AuditorExportFilename(getAuditPeriodFilenamePart(period), 'evidence_index')
  )
}

export async function exportDeviationSummaryCsv(period: AuditPeriod) {
  const rows = await fetchDeviationSummaryRows(period.id)
  downloadCsvContent(
    buildDeviationSummaryCsv(rows),
    getType2AuditorExportFilename(getAuditPeriodFilenamePart(period), 'deviation_summary')
  )
}

function getAuditPeriodFilenamePart(period: AuditPeriod): string {
  return `${period.name}_${period.start_date}_to_${period.end_date}`
}
