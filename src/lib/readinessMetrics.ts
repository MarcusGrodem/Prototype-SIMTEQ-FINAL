import { supabase } from './supabase';
import type { AuditorRequest, ControlExecution, Deviation, RemediationAction } from './types';

export type Rag = 'green' | 'amber' | 'red' | 'neutral';

export interface ReadinessMetrics {
  total: number;
  completed: number;
  onTime: number;
  scheduledOpen: number;
  overdue: number;
  evidenceDocs: { total: number; approved: number; rejected: number };
  execsWithApprovedEvidence: number;
  deviations: { open: number; critical: number; total: number };
  remediation: { totalClosed: number; closedOnTime: number };
  auditorRequests: { open: number; overdue: number };
  monthsCovered: number;
  monthsTotal: number;
  monthlyTrend: { month: string; rate: number; completed: number; total: number }[];
}

export const EMPTY_METRICS: ReadinessMetrics = {
  total: 0,
  completed: 0,
  onTime: 0,
  scheduledOpen: 0,
  overdue: 0,
  evidenceDocs: { total: 0, approved: 0, rejected: 0 },
  execsWithApprovedEvidence: 0,
  deviations: { open: 0, critical: 0, total: 0 },
  remediation: { totalClosed: 0, closedOnTime: 0 },
  auditorRequests: { open: 0, overdue: 0 },
  monthsCovered: 0,
  monthsTotal: 0,
  monthlyTrend: [],
};

export interface ReadinessKpiBreakdown {
  key: string;
  label: string;
  weight: number;
  score: number;
}

export interface ReadinessKpis {
  execRate: number | null;
  onTimeRate: number | null;
  evidenceComp: number | null;
  evidenceApproval: number | null;
  remediationSla: number | null;
  periodCoverage: number | null;
  readiness: number;
  breakdown: ReadinessKpiBreakdown[];
}

export function ragForPct(pct: number | null, green: number, amber: number): Rag {
  if (pct === null) return 'neutral';
  if (pct >= green) return 'green';
  if (pct >= amber) return 'amber';
  return 'red';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function enumerateMonths(startISO: string, endISO: string): { months: string[]; monthsTotal: number } {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const months: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return { months, monthsTotal: months.length };
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export async function loadReadinessMetrics(
  periodId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ReadinessMetrics> {
  const { data: execs = [] } = await supabase
    .from('control_executions')
    .select('id, status, scheduled_due_date, performed_date')
    .eq('audit_period_id', periodId);

  const executions = (execs ?? []) as Pick<
    ControlExecution,
    'id' | 'status' | 'scheduled_due_date' | 'performed_date'
  >[];
  const completedExecs = executions.filter(e => e.status === 'completed');
  const completedIds = completedExecs.map(e => e.id);

  let evidenceDocs = { total: 0, approved: 0, rejected: 0 };
  let execsWithApprovedEvidence = 0;
  if (completedIds.length > 0) {
    const { data: links = [] } = await supabase
      .from('document_links')
      .select('execution_id, documents!inner(id, reviewer_status)')
      .in('execution_id', completedIds);

    type LinkRow = { execution_id: string; documents: { id: string; reviewer_status: string } };
    const linkRows = (links ?? []) as LinkRow[];

    const approvedExecIds = new Set<string>();
    const docMap = new Map<string, string>();
    for (const l of linkRows) {
      if (l.documents) docMap.set(l.documents.id, l.documents.reviewer_status);
      if (l.documents?.reviewer_status === 'approved') approvedExecIds.add(l.execution_id);
    }
    execsWithApprovedEvidence = approvedExecIds.size;
    evidenceDocs = {
      total: docMap.size,
      approved: [...docMap.values()].filter(s => s === 'approved').length,
      rejected: [...docMap.values()].filter(s => s === 'rejected').length,
    };
  }

  const { data: devs = [] } = await supabase
    .from('deviations')
    .select('id, severity, status')
    .eq('audit_period_id', periodId);

  const deviations = (devs ?? []) as Pick<Deviation, 'id' | 'severity' | 'status'>[];
  const openDevs = deviations.filter(d => d.status !== 'closed' && d.status !== 'risk_accepted');

  const { data: reqs = [] } = await supabase
    .from('auditor_requests')
    .select('status, due_date')
    .eq('audit_period_id', periodId);

  const today = new Date().toISOString().split('T')[0];
  const auditorReqs = (reqs ?? []) as Pick<AuditorRequest, 'status' | 'due_date'>[];
  const openAuditorReqs = auditorReqs.filter(r => r.status === 'open');

  let remediation = { totalClosed: 0, closedOnTime: 0 };
  if (deviations.length > 0) {
    const devIds = deviations.map(d => d.id);
    const { data: rems = [] } = await supabase
      .from('remediation_actions')
      .select('status, due_date, closed_date')
      .in('deviation_id', devIds);

    const remActions = (rems ?? []) as Pick<RemediationAction, 'status' | 'due_date' | 'closed_date'>[];
    const closed = remActions.filter(r => r.status === 'closed' && r.closed_date);
    remediation = {
      totalClosed: closed.length,
      closedOnTime: closed.filter(r => !r.due_date || (r.closed_date! <= r.due_date)).length,
    };
  }

  const onTime = completedExecs.filter(e =>
    e.performed_date && e.performed_date <= e.scheduled_due_date
  ).length;

  const { months, monthsTotal } = enumerateMonths(periodStart, periodEnd);
  const monthlyTrend = months.map(m => {
    const inMonth = executions.filter(e => e.scheduled_due_date.startsWith(m));
    const compInMonth = inMonth.filter(e => e.status === 'completed').length;
    return {
      month: formatMonth(m),
      rate: inMonth.length > 0 ? Math.round((compInMonth / inMonth.length) * 100) : 0,
      completed: compInMonth,
      total: inMonth.length,
    };
  });
  const monthsCovered = monthlyTrend.filter(m => m.total > 0).length;

  return {
    total: executions.length,
    completed: completedExecs.length,
    onTime,
    scheduledOpen: executions.filter(e => e.status === 'scheduled' || e.status === 'in_progress').length,
    overdue: executions.filter(e => e.status === 'overdue').length,
    evidenceDocs,
    execsWithApprovedEvidence,
    deviations: {
      open: openDevs.length,
      critical: openDevs.filter(d => d.severity === 'critical').length,
      total: deviations.length,
    },
    remediation,
    auditorRequests: {
      open: openAuditorReqs.length,
      overdue: openAuditorReqs.filter(r => r.due_date && r.due_date < today).length,
    },
    monthsCovered,
    monthsTotal,
    monthlyTrend,
  };
}

export function computeReadinessKpis(m: ReadinessMetrics): ReadinessKpis {
  const execRate = m.total > 0 ? round1((m.completed / m.total) * 100) : null;
  const onTimeRate = m.completed > 0 ? round1((m.onTime / m.completed) * 100) : null;
  const evidenceComp = m.completed > 0 ? round1((m.execsWithApprovedEvidence / m.completed) * 100) : null;
  const evidenceApproval = m.evidenceDocs.total > 0 ? round1((m.evidenceDocs.approved / m.evidenceDocs.total) * 100) : null;
  const remediationSla = m.remediation.totalClosed > 0 ? round1((m.remediation.closedOnTime / m.remediation.totalClosed) * 100) : null;
  const periodCoverage = m.monthsTotal > 0 ? round1((m.monthsCovered / m.monthsTotal) * 100) : null;

  const exceptionScore =
    m.deviations.critical >= 2 ? 0 :
    m.deviations.critical === 1 ? 30 :
    m.deviations.open > 0 ? 70 : 100;

  const sExec = execRate ?? 100;
  const sEvidence = evidenceComp ?? 100;
  const sApproval = evidenceApproval ?? 100;
  const sExc = exceptionScore;
  const sRem = remediationSla ?? 100;
  const sAuditReq =
    m.auditorRequests.overdue > 1 ? 0 :
    m.auditorRequests.overdue === 1 ? 50 :
    m.auditorRequests.open > 0 ? 80 : 100;
  const sScope = 100;

  const readiness = round1(
    sExec * 0.25 +
    sEvidence * 0.25 +
    sApproval * 0.15 +
    sExc * 0.15 +
    sRem * 0.10 +
    sAuditReq * 0.05 +
    sScope * 0.05
  );

  return {
    execRate,
    onTimeRate,
    evidenceComp,
    evidenceApproval,
    remediationSla,
    periodCoverage,
    readiness,
    breakdown: [
      { key: 'execution',   label: 'Control Execution',     weight: 25, score: sExec },
      { key: 'evidence',    label: 'Evidence Completeness', weight: 25, score: sEvidence },
      { key: 'approval',    label: 'Evidence Approval',     weight: 15, score: sApproval },
      { key: 'exception',   label: 'Exceptions',            weight: 15, score: sExc },
      { key: 'remediation', label: 'Remediation SLA',       weight: 10, score: sRem },
      { key: 'auditreq',    label: 'Audit Requests',        weight: 5,  score: sAuditReq },
      { key: 'scope',       label: 'Scope Freshness',       weight: 5,  score: sScope },
    ],
  };
}
