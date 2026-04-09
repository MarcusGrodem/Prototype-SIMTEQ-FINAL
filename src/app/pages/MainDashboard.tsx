import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
  TrendingUp,
  Shield,
  AlertTriangle,
  Bell,
  Maximize2,
  Download,
  Sparkles,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { supabase } from '../../lib/supabase';
import { Risk, Control, Alert } from '../../lib/types';

export function MainDashboard() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [heatmapDialogOpen, setHeatmapDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [aiReportDialogOpen, setAiReportDialogOpen] = useState(false);
  const [alertsVisible, setAlertsVisible] = useState(true);

  useEffect(() => { loadData() }, []);

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

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Risk & Control Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of compliance status and risk management</p>
        </div>
        <div className="flex items-center gap-2">
          <CatchUpNotification />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export for Auditor
          </Button>
          <Button
            size="sm"
            onClick={() => setAiReportDialogOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Generate AI Report
          </Button>
        </div>
      </div>

      {/* Alerts banner */}
      {alerts.filter(a => a.type === 'error' || a.type === 'warning').length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <Bell className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-900">Action Required</p>
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
            className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
            title={alertsVisible ? 'Collapse' : 'Expand'}
          >
            {alertsVisible ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200 shadow-none">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Compliance Score</p>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{complianceScore}%</p>
          <Progress value={complianceScore} className="mt-3 h-1.5 bg-slate-100" />
        </Card>

        <Card className="p-5 border-slate-200 shadow-none">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Controls</p>
            <div className="w-8 h-8 bg-sky-50 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-sky-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalControls}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">{completedControls} completed</p>
        </Card>

        <Card className="p-5 border-slate-200 shadow-none">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">High Risks</p>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{highRisks}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">{totalRisks} total risks</p>
        </Card>

        <Card className="p-5 border-slate-200 shadow-none">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Overdue</p>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{overdueControls}</p>
          <p className="text-xs text-red-500 font-medium mt-1">Needs attention</p>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Control status */}
        <Card className="col-span-2 p-6 border-slate-200 shadow-none">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-slate-900">Control Status Overview</h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {complianceScore}% complete
            </span>
          </div>

          <div className="space-y-5">
            {[
              { label: 'Completed', count: completedControls, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
              { label: 'Pending', count: pendingControls, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' },
              { label: 'Overdue', count: overdueControls, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' },
            ].map(({ label, count, icon: Icon, color, bg }) => (
              <div key={label} className="flex items-center gap-4">
                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-700">{label}</span>
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </div>
                  <Progress
                    value={totalControls > 0 ? (count / totalControls) * 100 : 0}
                    className="h-1.5 bg-slate-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Risk heatmap */}
        <Card className="p-6 border-slate-200 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Risk Heatmap</h2>
            <button
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              onClick={handleOpenHeatmap}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Expand
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-4 gap-1.5 text-xs text-center">
              <div />
              <div className="font-medium text-slate-400">Low</div>
              <div className="font-medium text-slate-400">Med</div>
              <div className="font-medium text-slate-400">High</div>
            </div>
            {[
              { label: 'High', cells: [
                { filter: (r: Risk) => r.likelihood === 'High' && r.impact === 'Low', cls: 'bg-amber-100 text-amber-800' },
                { filter: (r: Risk) => r.likelihood === 'High' && r.impact === 'Medium', cls: 'bg-orange-200 text-orange-900' },
                { filter: (r: Risk) => r.likelihood === 'High' && r.impact === 'High', cls: 'bg-red-400 text-white' },
              ]},
              { label: 'Med', cells: [
                { filter: (r: Risk) => r.likelihood === 'Medium' && r.impact === 'Low', cls: 'bg-emerald-100 text-emerald-800' },
                { filter: (r: Risk) => r.likelihood === 'Medium' && r.impact === 'Medium', cls: 'bg-amber-200 text-amber-900' },
                { filter: (r: Risk) => r.likelihood === 'Medium' && r.impact === 'High', cls: 'bg-orange-300 text-orange-900' },
              ]},
              { label: 'Low', cells: [
                { filter: (r: Risk) => r.likelihood === 'Low' && r.impact === 'Low', cls: 'bg-emerald-200 text-emerald-900' },
                { filter: (r: Risk) => r.likelihood === 'Low' && r.impact === 'Medium', cls: 'bg-emerald-100 text-emerald-800' },
                { filter: (r: Risk) => r.likelihood === 'Low' && r.impact === 'High', cls: 'bg-amber-200 text-amber-900' },
              ]},
            ].map(row => (
              <div key={row.label} className="grid grid-cols-4 gap-1.5 items-center">
                <div className="text-xs font-medium text-slate-400">{row.label}</div>
                {row.cells.map((cell, i) => (
                  <div key={i} className={`h-11 ${cell.cls} rounded-md flex items-center justify-center text-sm font-semibold`}>
                    {risks.filter(cell.filter).length}
                  </div>
                ))}
              </div>
            ))}
            <p className="text-[10px] text-slate-400 text-center pt-1">Impact →</p>
          </div>
        </Card>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent controls */}
        <Card className="p-6 border-slate-200 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Controls</h2>
            <a href="/risks" className="text-xs text-sky-600 hover:text-sky-700 font-medium">View risks →</a>
          </div>
          <div className="space-y-2">
            {controls.slice(0, 5).map(control => (
              <div key={control.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{control.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{control.owner_name} · Next: {control.next_due ?? 'N/A'}</p>
                </div>
                <StatusBadge status={control.status} />
              </div>
            ))}
          </div>
        </Card>

        {/* Compliance issues */}
        <Card className="p-6 border-slate-200 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Active Compliance Issues</h2>
            {alerts.filter(a => a.type === 'error').length > 0 && (
              <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                {alerts.filter(a => a.type === 'error').length}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                  alert.type === 'error' ? 'bg-red-500' :
                  alert.type === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{alert.message}</p>
                  {alert.date && <p className="text-xs text-slate-400 mt-0.5">{alert.date}</p>}
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No active alerts</p>
            )}
          </div>
        </Card>
      </div>

      <RiskHeatmapDialog open={heatmapDialogOpen} onOpenChange={setHeatmapDialogOpen} />
      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      <AuditReportGenerator open={aiReportDialogOpen} onOpenChange={setAiReportDialogOpen} />
    </div>
  );
}
