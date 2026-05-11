import { supabase } from './supabase';
import type { KpiSnapshot, KpiSnapshotRagStatus } from './types';
import {
  ReadinessMetrics,
  computeReadinessKpis,
  ragForPct,
} from './readinessMetrics';

export interface KpiSnapshotInput {
  audit_period_id: string;
  snapshot_date: string;
  kpi_name: string;
  value: number | null;
  target: number | null;
  rag_status: KpiSnapshotRagStatus;
}

export interface KpiSnapshotSet {
  snapshot_date: string;
  created_at: string;
  rows: KpiSnapshot[];
}

const normalizeRag = (rag: string): KpiSnapshotRagStatus =>
  rag === 'green' || rag === 'amber' || rag === 'red' || rag === 'neutral'
    ? rag
    : 'neutral';

export function buildKpiSnapshotRows(
  auditPeriodId: string,
  snapshotDate: string,
  metrics: ReadinessMetrics,
): KpiSnapshotInput[] {
  const kpis = computeReadinessKpis(metrics);
  const openExceptionsRag: KpiSnapshotRagStatus =
    metrics.deviations.critical > 0 ? 'red' : metrics.deviations.open > 0 ? 'amber' : 'green';
  const criticalExceptionsRag: KpiSnapshotRagStatus =
    metrics.deviations.critical >= 2 ? 'red' : metrics.deviations.critical === 1 ? 'amber' : 'green';

  return [
    {
      audit_period_id: auditPeriodId,
      snapshot_date: snapshotDate,
      kpi_name: 'Type 2 Readiness Score',
      value: kpis.readiness,
      target: 90,
      rag_status: normalizeRag(ragForPct(kpis.readiness, 90, 80)),
    },
    {
      audit_period_id: auditPeriodId,
      snapshot_date: snapshotDate,
      kpi_name: 'Control Execution Rate',
      value: kpis.execRate,
      target: 95,
      rag_status: normalizeRag(ragForPct(kpis.execRate, 95, 85)),
    },
    {
      audit_period_id: auditPeriodId,
      snapshot_date: snapshotDate,
      kpi_name: 'On-Time Control Rate',
      value: kpis.onTimeRate,
      target: 95,
      rag_status: normalizeRag(ragForPct(kpis.onTimeRate, 95, 85)),
    },
    {
      audit_period_id: auditPeriodId,
      snapshot_date: snapshotDate,
      kpi_name: 'Evidence Completeness Rate',
      value: kpis.evidenceComp,
      target: 98,
      rag_status: normalizeRag(ragForPct(kpis.evidenceComp, 98, 90)),
    },
    {
      audit_period_id: auditPeriodId,
      snapshot_date: snapshotDate,
      kpi_name: 'Evidence Approval Rate',
      value: kpis.evidenceApproval,
      target: 95,
      rag_status: normalizeRag(ragForPct(kpis.evidenceApproval, 95, 85)),
    },
    {
      audit_period_id: auditPeriodId,
      snapshot_date: snapshotDate,
      kpi_name: 'Open Exceptions',
      value: metrics.deviations.open,
      target: 0,
      rag_status: openExceptionsRag,
    },
    {
      audit_period_id: auditPeriodId,
      snapshot_date: snapshotDate,
      kpi_name: 'Critical Exceptions',
      value: metrics.deviations.critical,
      target: 0,
      rag_status: criticalExceptionsRag,
    },
    {
      audit_period_id: auditPeriodId,
      snapshot_date: snapshotDate,
      kpi_name: 'Remediation SLA Compliance',
      value: kpis.remediationSla,
      target: 90,
      rag_status: normalizeRag(ragForPct(kpis.remediationSla, 90, 75)),
    },
    {
      audit_period_id: auditPeriodId,
      snapshot_date: snapshotDate,
      kpi_name: 'Period Coverage',
      value: kpis.periodCoverage,
      target: 100,
      rag_status: kpis.periodCoverage === null
        ? 'neutral'
        : kpis.periodCoverage >= 100
          ? 'green'
          : kpis.periodCoverage >= 80
            ? 'amber'
            : 'red',
    },
  ];
}

export async function saveKpiSnapshotSet(
  auditPeriodId: string,
  snapshotDate: string,
  metrics: ReadinessMetrics,
): Promise<KpiSnapshot[]> {
  const rows = buildKpiSnapshotRows(auditPeriodId, snapshotDate, metrics);
  const { data, error } = await supabase
    .from('kpi_snapshots')
    .upsert(rows, { onConflict: 'audit_period_id,snapshot_date,kpi_name' })
    .select('*')
    .order('kpi_name');

  if (error) throw error;
  return (data ?? []) as KpiSnapshot[];
}

export async function loadKpiSnapshotHistory(auditPeriodId: string): Promise<KpiSnapshotSet[]> {
  const { data, error } = await supabase
    .from('kpi_snapshots')
    .select('*')
    .eq('audit_period_id', auditPeriodId)
    .order('snapshot_date', { ascending: false })
    .order('kpi_name', { ascending: true });

  if (error) throw error;

  const grouped = new Map<string, KpiSnapshotSet>();
  for (const row of (data ?? []) as KpiSnapshot[]) {
    const existing = grouped.get(row.snapshot_date);
    if (existing) {
      existing.rows.push(row);
      if (row.created_at > existing.created_at) existing.created_at = row.created_at;
    } else {
      grouped.set(row.snapshot_date, {
        snapshot_date: row.snapshot_date,
        created_at: row.created_at,
        rows: [row],
      });
    }
  }

  return [...grouped.values()].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
}
