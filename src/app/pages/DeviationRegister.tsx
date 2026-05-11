import { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Deviation, RemediationAction, Control } from '../../lib/types';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { demoControls, demoDeviations, demoRemediationActions } from '../data/demoFallbacks';

// ─── helpers ────────────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high:     'bg-orange-100 text-orange-800 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  low:      'bg-slate-100 text-slate-700 border-slate-200',
};

const STATUS_STYLE: Record<string, string> = {
  open:               'bg-red-50 text-red-700',
  under_remediation:  'bg-blue-50 text-blue-700',
  retesting:          'bg-purple-50 text-purple-700',
  closed:             'bg-green-50 text-green-700',
  risk_accepted:      'bg-slate-100 text-slate-600',
};

const DEVIATION_TYPES = [
  'late_execution',
  'missing_evidence',
  'failed_control',
  'incomplete_approval',
  'other',
] as const;

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES   = ['open', 'under_remediation', 'retesting', 'closed', 'risk_accepted'] as const;

interface DeviationWithRemediation extends Deviation {
  remediation: RemediationAction | null;
  control_title: string;
}

// ─── empty form state ────────────────────────────────────────────────────────

const emptyDevForm = {
  control_id:   '',
  severity:     'medium' as Deviation['severity'],
  type:         'other' as Deviation['type'],
  description:  '',
  detected_date:'',
  root_cause:   '',
  audit_impact: '',
  owner_name:   '',
};

const emptyRemForm = {
  action_description: '',
  owner_name:         '',
  due_date:           '',
  retest_required:    false,
};

// ─── component ───────────────────────────────────────────────────────────────

export function DeviationRegister() {
  const [deviations, setDeviations] = useState<DeviationWithRemediation[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add deviation dialog
  const [addOpen, setAddOpen] = useState(false);
  const [devForm, setDevForm] = useState(emptyDevForm);
  const [savingDev, setSavingDev] = useState(false);

  // Edit deviation dialog
  const [editDev, setEditDev] = useState<DeviationWithRemediation | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Remediation panel state
  const [remForm, setRemForm] = useState<Record<string, typeof emptyRemForm>>({});
  const [savingRem, setSavingRem] = useState<string | null>(null);
  const [closingRem, setClosingRem] = useState<string | null>(null);

  const { activePeriod } = useAuditPeriod();
  const { profile } = useAuth();

  useEffect(() => { loadData(); }, [activePeriod]);

  const loadData = async () => {
    setLoading(true);
    const [devRes, ctrlRes] = await Promise.all([
      supabase.from('deviations').select('*, remediation_actions(*)').order('created_at', { ascending: false }),
      supabase.from('controls').select('id, title').order('id'),
    ]);

    const controlRows = ctrlRes.data && ctrlRes.data.length > 0
      ? ctrlRes.data as Control[]
      : demoControls;
    setControls(controlRows);

    const deviationRows = devRes.data && devRes.data.length > 0
      ? devRes.data as (Deviation & { remediation_actions: RemediationAction[] })[]
      : demoDeviations.map(deviation => ({
          ...deviation,
          remediation_actions: demoRemediationActions.filter(action => action.deviation_id === deviation.id),
        }));

    if (deviationRows.length > 0) {
      const ctrlMap = Object.fromEntries(controlRows.map((c: { id: string; title: string }) => [c.id, c.title]));
      const enriched = deviationRows.map(d => ({
        ...d,
        control_title: ctrlMap[d.control_id] ?? d.control_id,
        remediation: d.remediation_actions?.[0] ?? null,
      }));
      setDeviations(enriched);
    }
    setLoading(false);
  };

  // ─── counts ─────────────────────────────────────────────────────────────
  const openCount     = deviations.filter(d => d.status === 'open').length;
  const criticalCount = deviations.filter(d => d.severity === 'critical' && d.status !== 'closed' && d.status !== 'risk_accepted').length;
  const remCount      = deviations.filter(d => d.status === 'under_remediation').length;
  const closedCount   = deviations.filter(d => d.status === 'closed' || d.status === 'risk_accepted').length;

  // ─── filtered list ───────────────────────────────────────────────────────
  const filtered = deviations
    .filter(d => filterStatus === 'all' || d.status === filterStatus)
    .filter(d => filterSeverity === 'all' || d.severity === filterSeverity)
    .filter(d =>
      !search ||
      d.control_title.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase()) ||
      (d.owner_name ?? '').toLowerCase().includes(search.toLowerCase())
    );

  // ─── add deviation ───────────────────────────────────────────────────────
  const handleAddDeviation = async () => {
    if (!devForm.control_id || !devForm.description) {
      toast.error('Control and description are required');
      return;
    }
    setSavingDev(true);
    const { error } = await supabase.from('deviations').insert({
      control_id:     devForm.control_id,
      audit_period_id: activePeriod?.id ?? null,
      severity:       devForm.severity,
      type:           devForm.type,
      description:    devForm.description,
      detected_date:  devForm.detected_date || new Date().toISOString().split('T')[0],
      root_cause:     devForm.root_cause || null,
      audit_impact:   devForm.audit_impact || null,
      owner_name:     devForm.owner_name || null,
    });
    setSavingDev(false);
    if (error) { toast.error('Failed to save deviation'); return; }
    toast.success('Deviation logged');
    setAddOpen(false);
    setDevForm(emptyDevForm);
    loadData();
  };

  // ─── edit status/owner ───────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editDev) return;
    setSavingDev(true);
    const { error } = await supabase.from('deviations').update({
      severity:    editDev.severity,
      status:      editDev.status,
      owner_name:  editDev.owner_name,
      root_cause:  editDev.root_cause,
      audit_impact:editDev.audit_impact,
    }).eq('id', editDev.id);
    setSavingDev(false);
    if (error) { toast.error('Failed to update deviation'); return; }
    toast.success('Deviation updated');
    setEditOpen(false);
    setEditDev(null);
    loadData();
  };

  // ─── remediation ─────────────────────────────────────────────────────────
  const getRemForm = (devId: string) =>
    remForm[devId] ?? emptyRemForm;

  const setRemField = (devId: string, field: string, value: string | boolean) =>
    setRemForm(prev => ({ ...prev, [devId]: { ...getRemForm(devId), [field]: value } }));

  const handleSaveRemediation = async (dev: DeviationWithRemediation) => {
    const rf = getRemForm(dev.id);
    if (!rf.action_description) { toast.error('Action description is required'); return; }
    setSavingRem(dev.id);

    if (dev.remediation) {
      // update existing
      await supabase.from('remediation_actions').update({
        action_description: rf.action_description,
        owner_name:         rf.owner_name || null,
        due_date:           rf.due_date || null,
        retest_required:    rf.retest_required,
      }).eq('id', dev.remediation.id);
    } else {
      // insert new
      await supabase.from('remediation_actions').insert({
        deviation_id:       dev.id,
        action_description: rf.action_description,
        owner_name:         rf.owner_name || null,
        due_date:           rf.due_date || null,
        retest_required:    rf.retest_required,
      });
      // move deviation to under_remediation
      await supabase.from('deviations').update({ status: 'under_remediation' }).eq('id', dev.id);
    }

    setSavingRem(null);
    toast.success('Remediation action saved');
    loadData();
  };

  const handleCloseRemediation = async (dev: DeviationWithRemediation) => {
    if (!dev.remediation) return;
    setClosingRem(dev.id);
    const today = new Date().toISOString().split('T')[0];

    await supabase.from('remediation_actions').update({
      status:      'closed',
      closed_date: today,
    }).eq('id', dev.remediation.id);

    const nextDevStatus = dev.remediation.retest_required ? 'retesting' : 'closed';
    await supabase.from('deviations').update({ status: nextDevStatus }).eq('id', dev.id);

    setClosingRem(null);
    toast.success(nextDevStatus === 'retesting' ? 'Moved to retesting' : 'Deviation closed');
    loadData();
  };

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Deviation Register</h1>
            <p className="text-xs text-slate-400 mt-2">
              {activePeriod ? `Active period: ${activePeriod.name}` : 'No active audit period — deviations are shown across all periods'}
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => { setDevForm(emptyDevForm); setAddOpen(true); }}>
            <Plus className="w-4 h-4" />
            Log Deviation
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-4">
          <Card className={`p-4 ${criticalCount > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <ShieldAlert className={`w-5 h-5 ${criticalCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs text-slate-500">Critical / Open</p>
                <p className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>{criticalCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-slate-500">Open</p>
                <p className="text-2xl font-bold text-slate-900">{openCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-slate-500">Under Remediation</p>
                <p className="text-2xl font-bold text-slate-900">{remCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-slate-500">Closed</p>
                <p className="text-2xl font-bold text-slate-900">{closedCount}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search deviations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All severities</option>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <Card className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No deviations found</p>
            <p className="text-xs text-slate-400 mt-1">
              Log a deviation manually or use "Sync Overdue" on the Audit Periods page.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(dev => {
              const expanded = expandedId === dev.id;
              const rf = getRemForm(dev.id);
              const hasRem = !!dev.remediation;

              // pre-fill form when expanding for first time
              const handleExpand = () => {
                if (!expanded && hasRem && !remForm[dev.id]) {
                  setRemForm(prev => ({
                    ...prev,
                    [dev.id]: {
                      action_description: dev.remediation!.action_description,
                      owner_name:         dev.remediation!.owner_name ?? '',
                      due_date:           dev.remediation!.due_date ?? '',
                      retest_required:    dev.remediation!.retest_required,
                    },
                  }));
                }
                setExpandedId(expanded ? null : dev.id);
              };

              return (
                <Card key={dev.id} className={`overflow-hidden ${dev.severity === 'critical' && dev.status === 'open' ? 'border-red-200' : ''}`}>
                  {/* Row */}
                  <div
                    className="flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={handleExpand}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${SEVERITY_STYLE[dev.severity]}`}>
                          {dev.severity}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[dev.status]}`}>
                          {dev.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {dev.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 truncate">{dev.description || '(no description)'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <span>Control: <span className="font-medium text-slate-700">{dev.control_id}</span> — {dev.control_title}</span>
                        {dev.owner_name && <span>Owner: {dev.owner_name}</span>}
                        <span>Detected: {dev.detected_date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={e => { e.stopPropagation(); setEditDev({ ...dev }); setEditOpen(true); }}
                      >
                        Edit
                      </Button>
                      {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded remediation panel */}
                  {expanded && (
                    <div className="border-t bg-slate-50 p-5 space-y-4">
                      {/* Context fields */}
                      {(dev.root_cause || dev.audit_impact) && (
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {dev.root_cause && (
                            <div>
                              <p className="font-semibold text-slate-600 mb-0.5">Root cause</p>
                              <p className="text-slate-700">{dev.root_cause}</p>
                            </div>
                          )}
                          {dev.audit_impact && (
                            <div>
                              <p className="font-semibold text-slate-600 mb-0.5">Audit impact</p>
                              <p className="text-slate-700">{dev.audit_impact}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remediation form */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800 mb-3">
                          {hasRem ? 'Remediation Action' : 'Add Remediation Action'}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs">Action description *</Label>
                            <Input
                              value={rf.action_description}
                              onChange={e => setRemField(dev.id, 'action_description', e.target.value)}
                              placeholder="Describe the corrective action…"
                              className="mt-1 h-9 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Owner</Label>
                              <Input
                                value={rf.owner_name}
                                onChange={e => setRemField(dev.id, 'owner_name', e.target.value)}
                                placeholder="Responsible person"
                                className="mt-1 h-9 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Due date</Label>
                              <Input
                                type="date"
                                value={rf.due_date}
                                onChange={e => setRemField(dev.id, 'due_date', e.target.value)}
                                className="mt-1 h-9 text-sm"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rf.retest_required}
                              onChange={e => setRemField(dev.id, 'retest_required', e.target.checked)}
                              className="rounded"
                            />
                            Retest required before closing
                          </label>

                          {/* Existing remediation status */}
                          {hasRem && (
                            <div className="text-xs text-slate-500 bg-white rounded border border-slate-200 px-3 py-2">
                              Status: <span className="font-medium text-slate-700">{dev.remediation!.status}</span>
                              {dev.remediation!.closed_date && ` · Closed: ${dev.remediation!.closed_date}`}
                              {dev.remediation!.retest_result && ` · Retest: ${dev.remediation!.retest_result}`}
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              disabled={savingRem === dev.id}
                              onClick={() => handleSaveRemediation(dev)}
                            >
                              {savingRem === dev.id ? 'Saving…' : hasRem ? 'Update Remediation' : 'Save Remediation'}
                            </Button>
                            {hasRem && dev.remediation!.status !== 'closed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                disabled={closingRem === dev.id}
                                onClick={() => handleCloseRemediation(dev)}
                              >
                                {closingRem === dev.id ? '…' : 'Mark Remediated'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Deviation Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Deviation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Control *</Label>
              <select
                value={devForm.control_id}
                onChange={e => setDevForm(f => ({ ...f, control_id: e.target.value }))}
                className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select control…</option>
                {controls.map(c => <option key={c.id} value={c.id}>{c.id} — {c.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Severity</Label>
                <select
                  value={devForm.severity}
                  onChange={e => setDevForm(f => ({ ...f, severity: e.target.value as Deviation['severity'] }))}
                  className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select
                  value={devForm.type}
                  onChange={e => setDevForm(f => ({ ...f, type: e.target.value as Deviation['type'] }))}
                  className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {DEVIATION_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                value={devForm.description}
                onChange={e => setDevForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What went wrong?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Detected date</Label>
                <Input
                  type="date"
                  value={devForm.detected_date}
                  onChange={e => setDevForm(f => ({ ...f, detected_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Input
                  value={devForm.owner_name}
                  onChange={e => setDevForm(f => ({ ...f, owner_name: e.target.value }))}
                  placeholder="Responsible person"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Root cause</Label>
              <Input
                value={devForm.root_cause}
                onChange={e => setDevForm(f => ({ ...f, root_cause: e.target.value }))}
                placeholder="Why did this happen?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Audit impact</Label>
              <Input
                value={devForm.audit_impact}
                onChange={e => setDevForm(f => ({ ...f, audit_impact: e.target.value }))}
                placeholder="Potential impact on Type 2 report"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDeviation} disabled={savingDev}>
              {savingDev ? 'Saving…' : 'Log Deviation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit deviation dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Deviation</DialogTitle>
          </DialogHeader>
          {editDev && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Severity</Label>
                  <select
                    value={editDev.severity}
                    onChange={e => setEditDev(d => d ? { ...d, severity: e.target.value as Deviation['severity'] } : d)}
                    className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <select
                    value={editDev.status}
                    onChange={e => setEditDev(d => d ? { ...d, status: e.target.value as Deviation['status'] } : d)}
                    className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Input
                  value={editDev.owner_name ?? ''}
                  onChange={e => setEditDev(d => d ? { ...d, owner_name: e.target.value } : d)}
                  placeholder="Responsible person"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Root cause</Label>
                <Input
                  value={editDev.root_cause ?? ''}
                  onChange={e => setEditDev(d => d ? { ...d, root_cause: e.target.value } : d)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Audit impact</Label>
                <Input
                  value={editDev.audit_impact ?? ''}
                  onChange={e => setEditDev(d => d ? { ...d, audit_impact: e.target.value } : d)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingDev}>
              {savingDev ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
