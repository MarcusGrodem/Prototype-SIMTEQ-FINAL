import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Gauge, Activity, Clock, ShieldCheck, FileCheck, ShieldAlert,
  Wrench, CalendarRange, Bell, ArrowRight, Info,
} from 'lucide-react';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import {
  EMPTY_METRICS,
  Rag,
  ReadinessMetrics,
  computeReadinessKpis,
  loadReadinessMetrics,
  ragForPct,
} from '../../lib/readinessMetrics';

// ─── RAG helpers ─────────────────────────────────────────────────────────────

const RAG_CARD: Record<Rag, string> = {
  green:   'bg-emerald-50/60 border-emerald-200',
  amber:   'bg-amber-50/60 border-amber-200',
  red:     'bg-red-50/60 border-red-200',
  neutral: 'bg-white border-slate-200',
};

const RAG_VALUE: Record<Rag, string> = {
  green:   'text-emerald-700',
  amber:   'text-amber-700',
  red:     'text-red-700',
  neutral: 'text-slate-900',
};

const RAG_DOT: Record<Rag, string> = {
  green:   'bg-emerald-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  neutral: 'bg-slate-300',
};

// ─── component ───────────────────────────────────────────────────────────────

export function Type2ReadinessPage() {
  const { activePeriod, loading: periodLoading } = useAuditPeriod();
  const [metrics, setMetrics] = useState<ReadinessMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [activePeriod]);

  const loadData = async () => {
    setLoading(true);
    if (!activePeriod) {
      setMetrics(EMPTY_METRICS);
      setLoading(false);
      return;
    }
    const next = await loadReadinessMetrics(activePeriod.id, activePeriod.start_date, activePeriod.end_date);
    setMetrics(next);
    setLoading(false);
  };

  const kpis = useMemo(() => computeReadinessKpis(metrics), [metrics]);

  // ─── period progress ─────────────────────────────────────────────────────
  const periodProgress = useMemo(() => {
    if (!activePeriod) return null;
    const start = new Date(activePeriod.start_date).getTime();
    const end   = new Date(activePeriod.end_date).getTime();
    const now   = Date.now();
    if (end <= start) return null;
    const pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
    const daysRemaining = Math.max(0, Math.round((end - now) / 86_400_000));
    return { pct, daysRemaining };
  }, [activePeriod]);

  // ─── empty state: no active period ───────────────────────────────────────
  if (!periodLoading && !activePeriod) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="bg-white border-b border-slate-200 px-8 py-5">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Type 2 Readiness</h1>
            <p className="text-xs text-slate-400 mt-2">Operating effectiveness across the audit period</p>
          </div>
        </div>
        <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
          <Card className="p-12 text-center border-slate-200 shadow-none">
            <Gauge className="w-10 h-10 mx-auto mb-4 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No active audit period</p>
            <p className="text-xs text-slate-500 mt-1">
              Activate an audit period to see readiness KPIs.
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

  if (loading || periodLoading) {
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
  const showActionBanner = metrics.deviations.critical > 0 || metrics.overdue > 0 || metrics.auditorRequests.overdue > 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Type 2 Readiness</h1>
            <p className="text-xs text-slate-400 mt-2">
              {activePeriod!.name} · {activePeriod!.start_date} → {activePeriod!.end_date}
              {activePeriod!.auditor && <> · Auditor: {activePeriod!.auditor}</>}
            </p>
          </div>
          {periodProgress && (
            <div className="text-right">
              <p className="text-xs text-slate-400">Period progress</p>
              <p className="text-sm font-semibold text-slate-900 tabular-nums">{periodProgress.pct}% · {periodProgress.daysRemaining} days left</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">

        {/* Action Required banner */}
        {showActionBanner && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <Bell className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-900">Action Required</p>
              <div className="mt-1 space-y-0.5 text-sm text-red-700">
                {metrics.deviations.critical > 0 && (
                  <p>· <Link to="/deviations" className="underline">{metrics.deviations.critical} critical deviation{metrics.deviations.critical > 1 ? 's' : ''}</Link> still open</p>
                )}
                {metrics.overdue > 0 && (
                  <p>· <Link to="/audit-period" className="underline">{metrics.overdue} overdue execution{metrics.overdue > 1 ? 's' : ''}</Link> — sync to deviations</p>
                )}
                {metrics.auditorRequests.overdue > 0 && (
                  <p>· <Link to="/auditor-requests" className="underline">{metrics.auditorRequests.overdue} overdue auditor request{metrics.auditorRequests.overdue > 1 ? 's' : ''}</Link> still open</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Readiness Score hero */}
        <Card className={`border shadow-none ${RAG_CARD[readinessRag]}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-200/70">
            {/* Score */}
            <div className="p-8 md:col-span-1">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-slate-500" />
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Type 2 Readiness Score</p>
              </div>
              <p className={`text-6xl font-bold tabular-nums mt-3 leading-none ${RAG_VALUE[readinessRag]}`}>
                {Math.round(kpis.readiness)}<span className="text-2xl font-semibold opacity-60">/100</span>
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className={`size-2 rounded-full ${RAG_DOT[readinessRag]}`} />
                <span className="text-xs font-medium text-slate-600">
                  {readinessRag === 'green' ? 'On track' : readinessRag === 'amber' ? 'Needs attention' : readinessRag === 'red' ? 'At risk' : '—'}
                </span>
              </div>
              {periodProgress && (
                <div className="mt-5">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Period progress</span>
                    <span className="tabular-nums">{periodProgress.pct}%</span>
                  </div>
                  <Progress value={periodProgress.pct} className="h-1.5 bg-white/60" />
                </div>
              )}
            </div>

            {/* Weighted breakdown */}
            <div className="p-8 md:col-span-2 bg-white/40">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Weighted Breakdown</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {kpis.breakdown.map(b => (
                  <div key={b.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700">{b.label}</span>
                      <span className="text-slate-400 tabular-nums">
                        <span className="font-semibold text-slate-700">{Math.round(b.score)}</span> · {b.weight}%
                      </span>
                    </div>
                    <Progress value={b.score} className="h-1 bg-slate-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* 8 KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={Activity}
            label="Control Execution"
            value={kpis.execRate}
            unit="%"
            target="≥ 95%"
            rag={ragForPct(kpis.execRate, 95, 85)}
            sub={`${metrics.completed} of ${metrics.total} completed`}
            href="/audit-period"
          />
          <KpiCard
            icon={Clock}
            label="On-Time Rate"
            value={kpis.onTimeRate}
            unit="%"
            target="≥ 95%"
            rag={ragForPct(kpis.onTimeRate, 95, 85)}
            sub={`${metrics.onTime} of ${metrics.completed} on time`}
            href="/audit-period"
          />
          <KpiCard
            icon={ShieldCheck}
            label="Evidence Completeness"
            value={kpis.evidenceComp}
            unit="%"
            target="≥ 98%"
            rag={ragForPct(kpis.evidenceComp, 98, 90)}
            sub={`${metrics.execsWithApprovedEvidence} executions with approved evidence`}
            href="/evidence-review"
          />
          <KpiCard
            icon={FileCheck}
            label="Evidence Approval"
            value={kpis.evidenceApproval}
            unit="%"
            target="≥ 95%"
            rag={ragForPct(kpis.evidenceApproval, 95, 85)}
            sub={`${metrics.evidenceDocs.approved} approved · ${metrics.evidenceDocs.rejected} rejected`}
            href="/evidence-review"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Open Exceptions"
            value={metrics.deviations.open}
            unit=""
            target="0 critical"
            rag={metrics.deviations.critical > 0 ? 'red' : metrics.deviations.open > 0 ? 'amber' : 'green'}
            sub={metrics.deviations.critical > 0 ? `${metrics.deviations.critical} critical` : 'No critical issues'}
            href="/deviations"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Critical Exceptions"
            value={metrics.deviations.critical}
            unit=""
            target="0"
            rag={metrics.deviations.critical >= 2 ? 'red' : metrics.deviations.critical === 1 ? 'amber' : 'green'}
            sub={metrics.deviations.critical > 0 ? 'Resolve before report' : 'None open'}
            href="/deviations"
          />
          <KpiCard
            icon={Wrench}
            label="Remediation SLA"
            value={kpis.remediationSla}
            unit="%"
            target="≥ 90%"
            rag={ragForPct(kpis.remediationSla, 90, 75)}
            sub={`${metrics.remediation.closedOnTime} of ${metrics.remediation.totalClosed} closed on time`}
            href="/deviations"
          />
          <KpiCard
            icon={CalendarRange}
            label="Period Coverage"
            value={kpis.periodCoverage}
            unit="%"
            target="100%"
            rag={kpis.periodCoverage === null ? 'neutral' : kpis.periodCoverage >= 100 ? 'green' : kpis.periodCoverage >= 80 ? 'amber' : 'red'}
            sub={`${metrics.monthsCovered} of ${metrics.monthsTotal} months scheduled`}
            href="/audit-period"
          />
        </div>

        {/* Trend chart */}
        <Card className="border-slate-200 shadow-none">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Monthly Execution Rate</h2>
              <p className="text-xs text-slate-400 mt-0.5">Completed executions / scheduled executions per month</p>
            </div>
            <span className="text-[11px] font-medium text-slate-500">Target: 95%</span>
          </div>
          <div className="p-6">
            {metrics.monthlyTrend.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                No monthly data yet. Generate executions on the Audit Periods page.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={metrics.monthlyTrend} margin={{ top: 5, right: 16, left: -12, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                    formatter={(value: number, _name, item) => {
                      const p = item.payload as { completed: number; total: number };
                      return [`${value}% (${p.completed}/${p.total})`, 'Execution rate'];
                    }}
                  />
                  <ReferenceLine y={95} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#0f172a"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#0f172a' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
          <p>
            This score is an internal readiness indicator. It does not certify the organization or replace formal Type 2 testing performed by the external auditor.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, unit, target, rag, sub, href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  unit: string;
  target: string;
  rag: Rag;
  sub: string;
  href: string;
}) {
  const display = value === null ? '—' : Math.round(value).toString();
  return (
    <Link to={href} className={`block rounded-lg border p-4 hover:shadow-sm transition-shadow ${RAG_CARD[rag]}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest truncate">{label}</p>
      </div>
      <p className={`text-3xl font-bold tabular-nums mt-2 leading-none ${RAG_VALUE[rag]}`}>
        {display}<span className="text-base font-semibold opacity-70">{unit}</span>
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <span className="truncate">{sub}</span>
        <span className="ml-2 flex items-center gap-1 flex-shrink-0">
          <span className={`size-1.5 rounded-full ${RAG_DOT[rag]}`} />
          <span className="font-medium">{target}</span>
        </span>
      </div>
    </Link>
  );
}

