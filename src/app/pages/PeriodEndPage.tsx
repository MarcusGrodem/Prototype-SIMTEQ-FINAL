import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight, CalendarRange, CheckCircle2, Download, FileSignature,
  FileText, Gauge, Info, Lock, ShieldAlert, Snowflake,
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';

import { supabase } from '../../lib/supabase';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import {
  EMPTY_METRICS,
  ReadinessMetrics,
  computeReadinessKpis,
  loadReadinessMetrics,
  ragForPct,
  Rag,
} from '../../lib/readinessMetrics';
import {
  exportControlPopulationCsv,
  exportDeviationSummaryCsv,
  exportEvidenceIndexCsv,
} from '../../lib/type2AuditorExports';
import { Deviation, ManagementAssertion, Risk } from '../../lib/types';
import { AuditReportGenerator } from '../components/AuditReportGenerator';

// ─── small style maps (mirror Type2ReadinessPage) ────────────────────────────

const RAG_DOT: Record<Rag, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  neutral: 'bg-slate-300',
};

const RAG_TEXT: Record<Rag, string> = {
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
  neutral: 'text-slate-900',
};

const RAG_LABEL: Record<Rag, string> = {
  green: 'On track',
  amber: 'Watch',
  red: 'At risk',
  neutral: '—',
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-amber-100 text-amber-700 border-amber-200',
  low:      'bg-slate-100 text-slate-700 border-slate-200',
};

// ─── component ───────────────────────────────────────────────────────────────

export function PeriodEndPage() {
  const { activePeriod, loading: periodLoading, refresh: refreshPeriods } = useAuditPeriod();

  const [metrics, setMetrics] = useState<ReadinessMetrics>(EMPTY_METRICS);
  const [openDeviations, setOpenDeviations] = useState<Deviation[]>([]);
  const [openHighRisks, setOpenHighRisks] = useState<Risk[]>([]);
  const [assertion, setAssertion] = useState<ManagementAssertion | null>(null);
  const [loading, setLoading] = useState(true);

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [freezing, setFreezing] = useState(false);

  // assertion form state
  const [signerName, setSignerName] = useState('');
  const [signedDate, setSignedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingAssertion, setSavingAssertion] = useState(false);

  useEffect(() => { void loadAll(); }, [activePeriod]);

  // Sync local form state with the loaded assertion (if any)
  useEffect(() => {
    if (assertion) {
      setSignerName(assertion.signer_name);
      setSignedDate(assertion.signed_date);
      setAcknowledged(assertion.acknowledgement);
      setNotes(assertion.notes ?? '');
    } else {
      setSignerName('');
      setSignedDate(new Date().toISOString().split('T')[0]);
      setAcknowledged(false);
      setNotes('');
    }
  }, [assertion]);

  const loadAll = async () => {
    setLoading(true);
    if (!activePeriod) {
      setMetrics(EMPTY_METRICS);
      setOpenDeviations([]);
      setOpenHighRisks([]);
      setAssertion(null);
      setLoading(false);
      return;
    }

    const [m, devsRes, risksRes, assertRes] = await Promise.all([
      loadReadinessMetrics(activePeriod.id, activePeriod.start_date, activePeriod.end_date),
      supabase
        .from('deviations')
        .select('*')
        .eq('audit_period_id', activePeriod.id)
        .not('status', 'in', '(closed,risk_accepted)')
        .order('severity', { ascending: false })
        .order('detected_date', { ascending: false }),
      supabase
        .from('risks')
        .select('*')
        .eq('status', 'Active')
        .gte('risk_score', 6)
        .order('risk_score', { ascending: false }),
      supabase
        .from('management_assertions')
        .select('*')
        .eq('audit_period_id', activePeriod.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setMetrics(m);
    setOpenDeviations((devsRes.data as Deviation[]) ?? []);
    setOpenHighRisks((risksRes.data as Risk[]) ?? []);
    setAssertion((assertRes.data as ManagementAssertion | null) ?? null);
    setLoading(false);
  };

  const kpis = useMemo(() => computeReadinessKpis(metrics), [metrics]);

  const criticalDeviations = openDeviations.filter(d => d.severity === 'critical');

  const handleExport = async (
    kind: 'control_population' | 'evidence_index' | 'deviation_summary',
  ) => {
    if (!activePeriod) return;
    setExporting(kind);
    try {
      if (kind === 'control_population') await exportControlPopulationCsv(activePeriod);
      else if (kind === 'evidence_index') await exportEvidenceIndexCsv(activePeriod);
      else await exportDeviationSummaryCsv(activePeriod);
      toast.success('Export ready');
    } catch (e) {
      toast.error(`Failed to export: ${(e as Error).message}`);
    } finally {
      setExporting(null);
    }
  };

  const handleFreeze = async () => {
    if (!activePeriod) return;
    if (activePeriod.frozen_at) {
      // Unfreeze
      setFreezing(true);
      const { error } = await supabase
        .from('audit_periods')
        .update({ frozen_at: null, frozen_by_name: null })
        .eq('id', activePeriod.id);
      setFreezing(false);
      if (error) { toast.error('Failed to unfreeze period'); return; }
      toast.success('Period unfrozen');
      await refreshPeriods();
      return;
    }
    if (!signerName) {
      toast.error('Enter the signer name in the assertion section before freezing');
      return;
    }
    setFreezing(true);
    const { error } = await supabase
      .from('audit_periods')
      .update({
        frozen_at: new Date().toISOString(),
        frozen_by_name: signerName || null,
      })
      .eq('id', activePeriod.id);
    setFreezing(false);
    if (error) { toast.error('Failed to freeze period'); return; }
    toast.success('Period frozen');
    await refreshPeriods();
  };

  const handleSaveAssertion = async () => {
    if (!activePeriod) return;
    if (!signerName) { toast.error('Signer name is required'); return; }
    if (!acknowledged) { toast.error('You must acknowledge the period summary before saving'); return; }

    setSavingAssertion(true);
    const payload = {
      audit_period_id: activePeriod.id,
      signer_name: signerName,
      signed_date: signedDate,
      acknowledgement: acknowledged,
      notes: notes || null,
    };

    let error;
    if (assertion) {
      ({ error } = await supabase
        .from('management_assertions')
        .update(payload)
        .eq('id', assertion.id));
    } else {
      ({ error } = await supabase.from('management_assertions').insert(payload));
    }
    setSavingAssertion(false);
    if (error) { toast.error('Failed to save assertion'); return; }
    toast.success(assertion ? 'Assertion updated' : 'Assertion recorded');
    await loadAll();
  };

  // ─── empty state ─────────────────────────────────────────────────────────
  if (!periodLoading && !activePeriod) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="bg-white border-b border-slate-200 px-8 py-5">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Period End</h1>
            <p className="text-xs text-slate-400 mt-2">Period-end review, exports and management assertion</p>
          </div>
        </div>
        <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
          <Card className="p-12 text-center border-slate-200 shadow-none">
            <CalendarRange className="w-10 h-10 mx-auto mb-4 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No active audit period</p>
            <p className="text-xs text-slate-500 mt-1">
              Activate an audit period to run the period-end workflow.
            </p>
            <Link
              to="/audit-period"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
            >
              Go to Audit Periods <ArrowRight className="w-3 h-3" />
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (loading || periodLoading || !activePeriod) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <svg className="animate-spin h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const readinessRag = ragForPct(kpis.readiness, 90, 80);
  const isFrozen = !!activePeriod.frozen_at;

  // 8 KPI snapshot rows
  const kpiRows: { label: string; value: string; target: string; rag: Rag; sub: string }[] = [
    {
      label: 'Control Execution', value: kpis.execRate === null ? '—' : `${Math.round(kpis.execRate)}%`,
      target: '≥ 95%', rag: ragForPct(kpis.execRate, 95, 85),
      sub: `${metrics.completed} of ${metrics.total} completed`,
    },
    {
      label: 'On-Time Rate', value: kpis.onTimeRate === null ? '—' : `${Math.round(kpis.onTimeRate)}%`,
      target: '≥ 95%', rag: ragForPct(kpis.onTimeRate, 95, 85),
      sub: `${metrics.onTime} of ${metrics.completed} on time`,
    },
    {
      label: 'Evidence Completeness', value: kpis.evidenceComp === null ? '—' : `${Math.round(kpis.evidenceComp)}%`,
      target: '≥ 98%', rag: ragForPct(kpis.evidenceComp, 98, 90),
      sub: `${metrics.execsWithApprovedEvidence} executions with approved evidence`,
    },
    {
      label: 'Evidence Approval', value: kpis.evidenceApproval === null ? '—' : `${Math.round(kpis.evidenceApproval)}%`,
      target: '≥ 95%', rag: ragForPct(kpis.evidenceApproval, 95, 85),
      sub: `${metrics.evidenceDocs.approved} approved · ${metrics.evidenceDocs.rejected} rejected`,
    },
    {
      label: 'Open Exceptions', value: String(metrics.deviations.open),
      target: '0 critical',
      rag: metrics.deviations.critical > 0 ? 'red' : metrics.deviations.open > 0 ? 'amber' : 'green',
      sub: metrics.deviations.critical > 0 ? `${metrics.deviations.critical} critical` : 'No critical issues',
    },
    {
      label: 'Critical Exceptions', value: String(metrics.deviations.critical),
      target: '0',
      rag: metrics.deviations.critical >= 2 ? 'red' : metrics.deviations.critical === 1 ? 'amber' : 'green',
      sub: metrics.deviations.critical > 0 ? 'Resolve before sign-off' : 'None open',
    },
    {
      label: 'Remediation SLA', value: kpis.remediationSla === null ? '—' : `${Math.round(kpis.remediationSla)}%`,
      target: '≥ 90%', rag: ragForPct(kpis.remediationSla, 90, 75),
      sub: `${metrics.remediation.closedOnTime} of ${metrics.remediation.totalClosed} closed on time`,
    },
    {
      label: 'Period Coverage', value: kpis.periodCoverage === null ? '—' : `${Math.round(kpis.periodCoverage)}%`,
      target: '100%',
      rag: kpis.periodCoverage === null ? 'neutral' : kpis.periodCoverage >= 100 ? 'green' : kpis.periodCoverage >= 80 ? 'amber' : 'red',
      sub: `${metrics.monthsCovered} of ${metrics.monthsTotal} months scheduled`,
    },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Period End</h1>
            <p className="text-xs text-slate-400 mt-2 truncate">
              {activePeriod.name} · {activePeriod.start_date} → {activePeriod.end_date}
              {activePeriod.auditor && <> · Auditor: {activePeriod.auditor}</>}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-2 justify-end">
              <Gauge className={`w-4 h-4 ${RAG_TEXT[readinessRag]}`} />
              <span className={`text-2xl font-bold tabular-nums ${RAG_TEXT[readinessRag]}`}>
                {Math.round(kpis.readiness)}<span className="text-sm font-semibold opacity-60">/100</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Readiness · {RAG_LABEL[readinessRag]}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8 max-w-6xl mx-auto w-full">

        {/* Frozen banner */}
        {isFrozen && (
          <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Snowflake className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold text-blue-900">Period frozen</p>
              <p className="text-blue-700 mt-0.5">
                {activePeriod.frozen_by_name ? `Frozen by ${activePeriod.frozen_by_name} ` : 'Frozen '}
                on {new Date(activePeriod.frozen_at!).toLocaleString('en-GB')}.
                Evidence uploads still work — this is a soft cut-off for the auditor pack.
              </p>
            </div>
          </div>
        )}

        {/* Critical deviations callout */}
        {criticalDeviations.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold text-red-900">
                {criticalDeviations.length} critical deviation{criticalDeviations.length > 1 ? 's' : ''} unresolved
              </p>
              <p className="text-red-700 mt-0.5">
                Resolve or formally accept these before completing the management assertion.
              </p>
              <Link to="/deviations" className="text-xs text-red-700 underline mt-1 inline-block">
                Open Deviation Register →
              </Link>
            </div>
          </div>
        )}

        {/* KPI snapshot table */}
        <Card className="border-slate-200 shadow-none">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Period KPI Snapshot</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Eight executive KPIs as of {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
            <Link
              to="/readiness"
              className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
            >
              Live readiness <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50/60 text-[11px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="text-left font-semibold px-6 py-2">Metric</th>
                <th className="text-right font-semibold px-6 py-2 w-24">Value</th>
                <th className="text-right font-semibold px-6 py-2 w-24">Target</th>
                <th className="text-right font-semibold px-6 py-2 w-28">Status</th>
                <th className="text-left font-semibold px-6 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {kpiRows.map(row => (
                <tr key={row.label} className="border-t border-slate-100">
                  <td className="px-6 py-3 font-medium text-slate-800">{row.label}</td>
                  <td className={`px-6 py-3 text-right font-semibold tabular-nums ${RAG_TEXT[row.rag]}`}>{row.value}</td>
                  <td className="px-6 py-3 text-right text-xs text-slate-500 tabular-nums">{row.target}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={`size-1.5 rounded-full ${RAG_DOT[row.rag]}`} />
                      <span className="text-slate-600 font-medium">{RAG_LABEL[row.rag]}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-500 truncate">{row.sub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Open exceptions + Unresolved high risks (two columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exceptions */}
          <Card className="border-slate-200 shadow-none">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Open Exceptions</h2>
                <p className="text-xs text-slate-400 mt-0.5">{openDeviations.length} unresolved deviation{openDeviations.length === 1 ? '' : 's'}</p>
              </div>
              <Link to="/deviations" className="text-xs text-blue-700 hover:text-blue-900">View all →</Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {openDeviations.length === 0 && (
                <div className="px-6 py-8 text-center text-xs text-slate-400">
                  No open deviations. Period looks clean.
                </div>
              )}
              {openDeviations.slice(0, 10).map(d => (
                <div key={d.id} className="px-6 py-3 flex items-start gap-3">
                  <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[d.severity] ?? SEVERITY_BADGE.medium}`}>
                    {d.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{d.control_id} · {d.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500 truncate">{d.description}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums flex-shrink-0">{d.detected_date}</span>
                </div>
              ))}
              {openDeviations.length > 10 && (
                <div className="px-6 py-2 text-[11px] text-slate-400 text-center">
                  + {openDeviations.length - 10} more
                </div>
              )}
            </div>
          </Card>

          {/* High risks */}
          <Card className="border-slate-200 shadow-none">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Unresolved High Risks</h2>
                <p className="text-xs text-slate-400 mt-0.5">Active risks with score ≥ 6</p>
              </div>
              <Link to="/risks" className="text-xs text-blue-700 hover:text-blue-900">View all →</Link>
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {openHighRisks.length === 0 && (
                <div className="px-6 py-8 text-center text-xs text-slate-400">
                  No open high risks.
                </div>
              )}
              {openHighRisks.slice(0, 10).map(r => (
                <div key={r.id} className="px-6 py-3 flex items-start gap-3">
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border bg-orange-100 text-orange-700 border-orange-200 tabular-nums">
                    {r.risk_score}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{r.id} · {r.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {r.category} · {r.likelihood}/{r.impact} · Owner: {r.owner_name}
                    </p>
                  </div>
                </div>
              ))}
              {openHighRisks.length > 10 && (
                <div className="px-6 py-2 text-[11px] text-slate-400 text-center">
                  + {openHighRisks.length - 10} more
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Exports */}
        <Card className="border-slate-200 shadow-none">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Auditor Pack</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              CSV exports scoped to this period · open the audit report generator for the full DOCX/PDF report
            </p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3"
              onClick={() => handleExport('control_population')}
              disabled={exporting !== null}
            >
              <Download className="w-4 h-4" />
              <span className="text-left">
                <span className="block text-xs font-semibold">Control Population CSV</span>
                <span className="block text-[11px] text-slate-500">Every execution in the period</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3"
              onClick={() => handleExport('evidence_index')}
              disabled={exporting !== null}
            >
              <Download className="w-4 h-4" />
              <span className="text-left">
                <span className="block text-xs font-semibold">Evidence Index CSV</span>
                <span className="block text-[11px] text-slate-500">All execution-linked evidence</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-2 h-auto py-3"
              onClick={() => handleExport('deviation_summary')}
              disabled={exporting !== null}
            >
              <Download className="w-4 h-4" />
              <span className="text-left">
                <span className="block text-xs font-semibold">Deviation Summary CSV</span>
                <span className="block text-[11px] text-slate-500">Open + remediated deviations</span>
              </span>
            </Button>
            <Button
              variant="default"
              className="justify-start gap-2 h-auto py-3"
              onClick={() => setReportDialogOpen(true)}
            >
              <FileText className="w-4 h-4" />
              <span className="text-left">
                <span className="block text-xs font-semibold">Open Report Generator</span>
                <span className="block text-[11px] text-blue-100">Full ISAE 3402 DOCX/PDF</span>
              </span>
            </Button>
          </div>
        </Card>

        {/* Management assertion */}
        <Card className="border-slate-200 shadow-none">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-slate-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Management Assertion</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Acknowledge the period summary before sharing the auditor pack
              </p>
            </div>
            {assertion?.acknowledgement && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" /> Signed
              </span>
            )}
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="signer">Signer name *</Label>
                <Input
                  id="signer"
                  placeholder="e.g. Jane Doe, CEO"
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signed-date">Signed date *</Label>
                <Input
                  id="signed-date"
                  type="date"
                  value={signedDate}
                  onChange={e => setSignedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Reservations, scope notes, or context for the auditor"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={v => setAcknowledged(v === true)}
                className="mt-0.5"
              />
              <span>
                I have reviewed the period KPIs, open exceptions and unresolved high risks above, and confirm that
                management is aware of the {metrics.deviations.open} open deviation{metrics.deviations.open === 1 ? '' : 's'}
                {metrics.deviations.critical > 0 && <> (including {metrics.deviations.critical} critical)</>}
                {' '}and {openHighRisks.length} unresolved high risk{openHighRisks.length === 1 ? '' : 's'} for
                <strong> {activePeriod.name}</strong>.
              </span>
            </label>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="text-[11px] text-slate-500">
                {assertion
                  ? <>Last saved {new Date(assertion.updated_at).toLocaleString('en-GB')}</>
                  : <>Not yet signed for this period</>
                }
              </div>
              <Button onClick={handleSaveAssertion} disabled={savingAssertion}>
                {savingAssertion ? 'Saving…' : assertion ? 'Update Assertion' : 'Record Assertion'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Period freeze */}
        <Card className={`shadow-none ${isFrozen ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'}`}>
          <div className="p-6 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isFrozen ? 'bg-blue-100' : 'bg-slate-100'}`}>
              {isFrozen ? <Snowflake className="w-5 h-5 text-blue-600" /> : <Lock className="w-5 h-5 text-slate-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">
                {isFrozen ? 'Period is frozen' : 'Freeze the period'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Freezing marks the period as the final cut-off for the auditor pack. It does not block
                evidence uploads — late submissions will be visible to the auditor as post-freeze additions.
                Use <Link to="/audit-period" className="underline text-blue-700">Audit Periods</Link> to fully close the period.
              </p>
              <div className="mt-3">
                <Button
                  variant={isFrozen ? 'outline' : 'default'}
                  className="gap-2"
                  onClick={handleFreeze}
                  disabled={freezing}
                >
                  <Snowflake className="w-4 h-4" />
                  {freezing ? 'Working…' : isFrozen ? 'Unfreeze Period' : 'Freeze Period'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
          <p>
            The management assertion captures internal sign-off on the period. The external auditor issues
            the formal ISAE 3402 Type 2 report — this workflow does not replace that.
          </p>
        </div>
      </div>

      <AuditReportGenerator open={reportDialogOpen} onOpenChange={setReportDialogOpen} />
    </div>
  );
}
