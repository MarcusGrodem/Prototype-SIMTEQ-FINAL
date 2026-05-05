import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { StatusBadge } from '../components/StatusBadge';
import { RiskHeatmapDialog } from '../components/RiskHeatmapDialog';
import { ExportDialog } from '../components/ExportDialog';
import { AuditReportGenerator } from '../components/AuditReportGenerator';
import { CatchUpNotification } from '../components/CatchUpNotification';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Bell,
  Maximize2,
  Download,
  FileText,
  ChevronUp,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { supabase } from '../../lib/supabase';
import { Risk, Control, Alert } from '../../lib/types';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';

export function MainDashboard() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [heatmapDialogOpen, setHeatmapDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [aiReportDialogOpen, setAiReportDialogOpen] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(true);
  const [evidenceCompletenessRate, setEvidenceCompletenessRate] = useState<number | null>(null);
  const [openDeviations, setOpenDeviations] = useState<{ total: number; critical: number } | null>(null);

  const { activePeriod } = useAuditPeriod();

  useEffect(() => { loadData() }, [activePeriod]);

  const loadData = async () => {
    setLoading(true);
    const [rRes, cRes, aRes] = await Promise.all([
      supabase.from('risks').select('*'),
      supabase.from('controls').select('*'),
      supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(10)
    ]);
    if (rRes.data) setRisks(rRes.data);
    if (cRes.data) setControls(cRes.data);
    if (aRes.data) setAlerts(aRes.data);

    // Evidence Completeness Rate for active audit period
    if (activePeriod) {
      const { data: execs } = await supabase
        .from('control_executions')
        .select('id')
        .eq('audit_period_id', activePeriod.id)
        .eq('status', 'completed');

      if (execs && execs.length > 0) {
        const execIds = execs.map(e => e.id);
        const { data: links } = await supabase
          .from('document_links')
          .select('execution_id, documents!inner(reviewer_status)')
          .in('execution_id', execIds)
          .eq('documents.reviewer_status', 'approved');

        const execsWithApprovedEvidence = new Set(
          (links ?? []).map((l: { execution_id: string }) => l.execution_id)
        ).size;
        setEvidenceCompletenessRate(Math.round((execsWithApprovedEvidence / execs.length) * 100));
      } else {
        setEvidenceCompletenessRate(null);
      }
    } else {
      setEvidenceCompletenessRate(null);
    }

    // Open deviation counts (all periods, not just active — deviations are always relevant)
    const { data: devData } = await supabase
      .from('deviations')
      .select('severity, status')
      .not('status', 'in', '("closed","risk_accepted")');

    if (devData) {
      setOpenDeviations({
        total:    devData.length,
        critical: devData.filter(d => d.severity === 'critical').length,
      });
    } else {
      setOpenDeviations(null);
    }

    setLoading(false);
  };

  const totalControls = controls.length;
  const completedControls = controls.filter(c => c.status === 'Completed').length;
  const pendingControls = controls.filter(c => c.status === 'Pending').length;
  const overdueControls = controls.filter(c => c.status === 'Overdue').length;
  const totalRisks = risks.length;
  const highRisks = risks.filter(r => r.risk_score >= 7).length;
  const complianceScore = totalControls > 0 ? Math.round((completedControls / totalControls) * 100) : 0;

  const handleOpenHeatmap = useCallback(() => setHeatmapDialogOpen(true), []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <svg className="animate-spin h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const now = new Date();
  const period = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Risk &amp; Control Dashboard</h1>
            <p className="text-xs text-slate-400 mt-2">Reporting period: {period}</p>
          </div>
          <div className="flex items-center gap-2">
            <CatchUpNotification />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export for Auditor
            </Button>
            <Button
              size="sm"
              onClick={() => setAiReportDialogOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              ISAE 3402 Report
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Alerts banner */}
        {alerts.filter(a => a.type === 'error' || a.type === 'warning').length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <Bell className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-900">Action Required</p>
              {alertsVisible && (
                <div className="mt-1 space-y-0.5">
                  {alerts.filter(a => a.type === 'error').map(alert => (
                    <p key={alert.id} className="text-sm text-red-700">· {alert.message}</p>
                  ))}
                  {alerts.filter(a => a.type === 'warning').slice(0, 2).map(alert => (
                    <p key={alert.id} className="text-sm text-red-600">· {alert.message}</p>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setAlertsVisible(!alertsVisible)}
              className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0 cursor-pointer"
              title={alertsVisible ? 'Collapse' : 'Expand'}
            >
              {alertsVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* KPI strip — compliance score is the hero */}
        <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden divide-x divide-slate-200">
          <Link to="/controls" className="w-2/5 shrink-0 px-8 py-7 hover:bg-slate-50 transition-colors">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Compliance Score</p>
            <p className="text-5xl font-bold text-slate-900 tabular-nums mt-3 leading-none">
              {complianceScore}<span className="text-2xl font-semibold text-slate-500">%</span>
            </p>
            <Progress value={complianceScore} className="mt-4 h-0.5 bg-slate-100" />
            <p className="text-xs text-slate-400 mt-2">{completedControls} of {totalControls} controls complete</p>
          </Link>
          <Link to="/controls" className="flex-1 px-6 py-7 hover:bg-slate-50 transition-colors">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Controls</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-3">{totalControls}</p>
            <p className="text-xs text-slate-400 mt-3">{pendingControls} pending review</p>
          </Link>
          <Link to="/risks" className="flex-1 px-6 py-7 hover:bg-slate-50 transition-colors">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">High Risks</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-3">{highRisks}</p>
            <p className="text-xs text-slate-400 mt-3">{totalRisks} in register</p>
          </Link>
          <Link to="/controls" className={`flex-1 px-6 py-7 hover:bg-slate-50 transition-colors ${overdueControls > 0 ? 'bg-red-50/60' : ''}`}>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Overdue</p>
            <p className={`text-3xl font-bold tabular-nums mt-3 ${overdueControls > 0 ? 'text-red-600' : 'text-slate-900'}`}>{overdueControls}</p>
            <p className={`text-xs mt-3 font-medium ${overdueControls > 0 ? 'text-red-500' : 'text-slate-400'}`}>{overdueControls > 0 ? 'Requires immediate action' : 'All controls on track'}</p>
          </Link>
          {evidenceCompletenessRate !== null && (
            <Link
              to="/evidence-review"
              className={`flex-1 px-6 py-7 hover:bg-slate-50 transition-colors ${
                evidenceCompletenessRate < 90 ? 'bg-red-50/60' : evidenceCompletenessRate < 98 ? 'bg-yellow-50/60' : ''
              }`}
            >
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Evidence Rate</p>
              <p className={`text-3xl font-bold tabular-nums mt-3 ${
                evidenceCompletenessRate < 90 ? 'text-red-600' : evidenceCompletenessRate < 98 ? 'text-yellow-600' : 'text-emerald-600'
              }`}>
                {evidenceCompletenessRate}<span className="text-lg font-semibold">%</span>
              </p>
              <p className="text-xs mt-3 text-slate-400">Approved evidence / completed</p>
            </Link>
          )}
          {openDeviations !== null && (
            <Link
              to="/deviations"
              className={`flex-1 px-6 py-7 hover:bg-slate-50 transition-colors ${
                openDeviations.critical > 0 ? 'bg-red-50/60' : openDeviations.total > 0 ? 'bg-orange-50/40' : ''
              }`}
            >
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Open Deviations</p>
              <p className={`text-3xl font-bold tabular-nums mt-3 ${
                openDeviations.critical > 0 ? 'text-red-600' : openDeviations.total > 0 ? 'text-orange-600' : 'text-slate-900'
              }`}>{openDeviations.total}</p>
              <p className={`text-xs mt-3 font-medium ${openDeviations.critical > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                {openDeviations.critical > 0 ? `${openDeviations.critical} critical` : openDeviations.total > 0 ? 'Needs attention' : 'No open deviations'}
              </p>
            </Link>
          )}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Control status */}
          <Card className="col-span-2 border-slate-200 shadow-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Control Status Overview</h2>
              <Link to="/controls" className="text-xs font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-6 space-y-5">
              {[
                { label: 'Completed', count: completedControls, icon: CheckCircle2, color: 'text-emerald-600', bar: 'bg-emerald-500' },
                { label: 'Pending', count: pendingControls, icon: Clock, color: 'text-amber-600', bar: 'bg-amber-500' },
                { label: 'Overdue', count: overdueControls, icon: AlertCircle, color: 'text-red-600', bar: 'bg-red-500' },
              ].map(({ label, count, icon: Icon, color }) => (
                <Link key={label} to="/controls" className="flex items-center gap-4 rounded-lg px-2 py-1 -mx-2 hover:bg-slate-50 transition-colors group">
                  <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{label}</span>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">{count}</span>
                    </div>
                    <Progress
                      value={totalControls > 0 ? (count / totalControls) * 100 : 0}
                      className="h-1.5 bg-slate-100"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Risk heatmap */}
          <Card className="border-slate-200 shadow-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Risk Matrix</h2>
              <button
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                onClick={handleOpenHeatmap}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Expand
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1.5 text-xs text-center mb-1">
                  <div className="text-xs text-slate-400 font-medium text-left">Likelihood</div>
                  <div className="font-medium text-slate-400">Low</div>
                  <div className="font-medium text-slate-400">Med</div>
                  <div className="font-medium text-slate-400">High</div>
                </div>
                {[
                  { label: 'High', cells: [
                    { filter: (r: Risk) => r.likelihood === 'High' && r.impact === 'Low', cls: 'bg-amber-100 text-amber-800 hover:bg-amber-200' },
                    { filter: (r: Risk) => r.likelihood === 'High' && r.impact === 'Medium', cls: 'bg-orange-200 text-orange-900 hover:bg-orange-300' },
                    { filter: (r: Risk) => r.likelihood === 'High' && r.impact === 'High', cls: 'bg-red-400 text-white hover:bg-red-500' },
                  ]},
                  { label: 'Med', cells: [
                    { filter: (r: Risk) => r.likelihood === 'Medium' && r.impact === 'Low', cls: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' },
                    { filter: (r: Risk) => r.likelihood === 'Medium' && r.impact === 'Medium', cls: 'bg-amber-200 text-amber-900 hover:bg-amber-300' },
                    { filter: (r: Risk) => r.likelihood === 'Medium' && r.impact === 'High', cls: 'bg-orange-300 text-orange-900 hover:bg-orange-400' },
                  ]},
                  { label: 'Low', cells: [
                    { filter: (r: Risk) => r.likelihood === 'Low' && r.impact === 'Low', cls: 'bg-emerald-200 text-emerald-900 hover:bg-emerald-300' },
                    { filter: (r: Risk) => r.likelihood === 'Low' && r.impact === 'Medium', cls: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' },
                    { filter: (r: Risk) => r.likelihood === 'Low' && r.impact === 'High', cls: 'bg-amber-200 text-amber-900 hover:bg-amber-300' },
                  ]},
                ].map(row => (
                  <div key={row.label} className="grid grid-cols-4 gap-1.5 items-center">
                    <div className="text-xs font-medium text-slate-400">{row.label}</div>
                    {row.cells.map((cell, i) => (
                      <Link key={i} to="/risks" className={`h-14 ${cell.cls} rounded-md flex items-center justify-center text-sm font-semibold tabular-nums transition-colors cursor-pointer`}>
                        {risks.filter(cell.filter).length}
                      </Link>
                    ))}
                  </div>
                ))}
                <p className="text-xs text-slate-400 text-center pt-2">Impact →</p>
                <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
                  {[
                    { label: 'Low', cls: 'bg-emerald-200' },
                    { label: 'Medium', cls: 'bg-amber-200' },
                    { label: 'High', cls: 'bg-orange-300' },
                    { label: 'Critical', cls: 'bg-red-400' },
                  ].map(({ label, cls }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`size-2.5 rounded-sm ${cls}`} />
                      <span className="text-[11px] font-medium text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent controls */}
          <Card className="border-slate-200 shadow-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Recent Controls</h2>
              <Link to="/controls" className="text-xs text-slate-400 hover:text-slate-700 font-medium flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-3">
              {controls.slice(0, 5).map(control => (
                <Link key={control.id} to="/controls" className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-sky-700 transition-colors">{control.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{control.owner_name} · Due: {control.next_due ?? 'N/A'}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <StatusBadge status={control.status} />
                  </div>
                </Link>
              ))}
              {controls.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <p className="text-sm font-medium text-slate-600">No controls yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add your first control to begin tracking compliance execution.</p>
                  <Link to="/controls" className="mt-3 text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 transition-colors">
                    Go to Control Management →
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* Compliance issues */}
          <Card className="border-slate-200 shadow-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Active Compliance Issues</h2>
              {alerts.filter(a => a.type === 'error').length > 0 && (
                <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full tabular-nums">
                  {alerts.filter(a => a.type === 'error').length} critical
                </span>
              )}
            </div>
            <div className="p-3">
              {alerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                  <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-sm mt-0.5 ${
                    alert.type === 'error' ? 'bg-red-100 text-red-700' :
                    alert.type === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {alert.type === 'error' ? 'Error' : alert.type === 'warning' ? 'Warn' : 'Info'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 leading-snug">{alert.message}</p>
                    {alert.date && <p className="text-xs text-slate-400 mt-0.5">{alert.date}</p>}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <p className="text-sm font-medium text-slate-600">No active issues</p>
                  <p className="text-xs text-slate-400 mt-1">All controls are current — no alerts have been raised.</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <RiskHeatmapDialog open={heatmapDialogOpen} onOpenChange={setHeatmapDialogOpen} />
        <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
        <AuditReportGenerator open={aiReportDialogOpen} onOpenChange={setAiReportDialogOpen} />
      </div>
    </div>
  );
}
