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
  CalendarDays,
  Plus,
  Play,
  Lock,
  Archive,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuditPeriod, Control } from '../../lib/types';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import { toast } from 'sonner';

function periodProgress(period: AuditPeriod): number {
  const start = new Date(period.start_date).getTime();
  const end = new Date(period.end_date).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function daysRemaining(period: AuditPeriod): number {
  const diff = new Date(period.end_date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function generateDueDates(control: Control, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start);

  if (control.frequency === 'Monthly') {
    cursor.setDate(1);
    while (cursor <= end) {
      const dueDate = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0); // last day of month
      if (dueDate >= start && dueDate <= end) dates.push(new Date(dueDate));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else if (control.frequency === 'Quarterly') {
    // Q1=Mar31, Q2=Jun30, Q3=Sep30, Q4=Dec31
    const quarterEnds = [
      new Date(start.getFullYear(), 2, 31),
      new Date(start.getFullYear(), 5, 30),
      new Date(start.getFullYear(), 8, 30),
      new Date(start.getFullYear(), 11, 31),
      new Date(start.getFullYear() + 1, 2, 31),
      new Date(start.getFullYear() + 1, 5, 30),
      new Date(start.getFullYear() + 1, 8, 30),
      new Date(start.getFullYear() + 1, 11, 31),
    ];
    for (const d of quarterEnds) {
      if (d >= start && d <= end) dates.push(d);
    }
  } else if (control.frequency === 'Yearly') {
    const dueDate = new Date(start.getFullYear(), 11, 31); // Dec 31 of start year
    if (dueDate >= start && dueDate <= end) dates.push(dueDate);
    const nextYear = new Date(start.getFullYear() + 1, 11, 31);
    if (nextYear >= start && nextYear <= end) dates.push(nextYear);
  }

  return dates;
}

interface PeriodFormData {
  name: string;
  start_date: string;
  end_date: string;
  freeze_date: string;
  report_due_date: string;
  auditor: string;
}

const emptyForm: PeriodFormData = {
  name: '',
  start_date: '',
  end_date: '',
  freeze_date: '',
  report_due_date: '',
  auditor: '',
};

function statusBadge(status: AuditPeriod['status']) {
  const map = {
    planned:  'bg-slate-100 text-slate-700',
    active:   'bg-green-100 text-green-700',
    closed:   'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-500',
  };
  return map[status] ?? map.planned;
}

export function AuditPeriodPage() {
  const { allPeriods, activePeriod, refresh } = useAuditPeriod();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<AuditPeriod | null>(null);
  const [form, setForm] = useState<PeriodFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    if (editingPeriod) {
      setForm({
        name: editingPeriod.name,
        start_date: editingPeriod.start_date,
        end_date: editingPeriod.end_date,
        freeze_date: editingPeriod.freeze_date ?? '',
        report_due_date: editingPeriod.report_due_date ?? '',
        auditor: editingPeriod.auditor ?? '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingPeriod]);

  const openNew = () => { setEditingPeriod(null); setDialogOpen(true); };
  const openEdit = (p: AuditPeriod) => { setEditingPeriod(p); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error('Name, start date and end date are required');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      start_date: form.start_date,
      end_date: form.end_date,
      freeze_date: form.freeze_date || null,
      report_due_date: form.report_due_date || null,
      auditor: form.auditor || null,
    };

    let error;
    if (editingPeriod) {
      ({ error } = await supabase.from('audit_periods').update(payload).eq('id', editingPeriod.id));
    } else {
      ({ error } = await supabase.from('audit_periods').insert(payload));
    }

    setSaving(false);
    if (error) { toast.error('Failed to save period'); return; }
    toast.success(editingPeriod ? 'Period updated' : 'Period created');
    setDialogOpen(false);
    refresh();
  };

  const handleActivate = async (period: AuditPeriod) => {
    // Deactivate any existing active period first
    await supabase.from('audit_periods').update({ status: 'planned' }).eq('status', 'active');
    const { error } = await supabase.from('audit_periods').update({ status: 'active' }).eq('id', period.id);
    if (error) { toast.error('Failed to activate period'); return; }
    toast.success(`"${period.name}" is now active`);
    refresh();
  };

  const handleClose = async (period: AuditPeriod) => {
    const { error } = await supabase.from('audit_periods').update({ status: 'closed' }).eq('id', period.id);
    if (error) { toast.error('Failed to close period'); return; }
    toast.success('Period closed');
    refresh();
  };

  const handleSyncDeviations = async (period: AuditPeriod) => {
    setSyncing(period.id);
    const today = new Date().toISOString().split('T')[0];

    // Find overdue executions: scheduled, past due, no existing deviation
    const { data: overdueExecs } = await supabase
      .from('control_executions')
      .select('id, control_id, scheduled_due_date')
      .eq('audit_period_id', period.id)
      .eq('status', 'scheduled')
      .lt('scheduled_due_date', today);

    if (!overdueExecs || overdueExecs.length === 0) {
      toast.info('No new overdue executions to sync');
      setSyncing(null);
      return;
    }

    // Get execution IDs that already have a deviation
    const execIds = overdueExecs.map(e => e.id);
    const { data: existingDevs } = await supabase
      .from('deviations')
      .select('execution_id')
      .in('execution_id', execIds);

    const alreadyLogged = new Set((existingDevs ?? []).map(d => d.execution_id));
    const toCreate = overdueExecs.filter(e => !alreadyLogged.has(e.id));

    if (toCreate.length === 0) {
      toast.info('All overdue executions already have deviations');
      setSyncing(null);
      return;
    }

    const rows = toCreate.map(e => ({
      control_id:      e.control_id,
      execution_id:    e.id,
      audit_period_id: period.id,
      severity:        'medium',
      type:            'late_execution',
      description:     `Control execution due ${e.scheduled_due_date} was not completed on time`,
      detected_date:   today,
      status:          'open',
    }));

    const { error } = await supabase.from('deviations').insert(rows);
    setSyncing(null);
    if (error) { toast.error('Failed to create deviations'); return; }
    toast.success(`Created ${toCreate.length} deviation${toCreate.length > 1 ? 's' : ''} for overdue executions`);
  };

  const handleGenerateExecutions = async (period: AuditPeriod) => {
    setGenerating(period.id);
    const { data: controls, error: cErr } = await supabase.from('controls').select('*');
    if (cErr || !controls) { toast.error('Could not load controls'); setGenerating(null); return; }

    const start = new Date(period.start_date);
    const end = new Date(period.end_date);

    // Remove existing scheduled stubs for this period so re-generate is idempotent
    await supabase.from('control_executions')
      .delete()
      .eq('audit_period_id', period.id)
      .eq('status', 'scheduled');

    const rows: {
      control_id: string;
      audit_period_id: string;
      scheduled_due_date: string;
      status: string;
    }[] = [];

    for (const control of controls) {
      const dueDates = generateDueDates(control as Control, start, end);
      for (const d of dueDates) {
        rows.push({
          control_id: control.id,
          audit_period_id: period.id,
          scheduled_due_date: d.toISOString().split('T')[0],
          status: 'scheduled',
        });
      }
    }

    if (rows.length === 0) {
      toast.warning('No execution dates generated — check period dates and control frequencies');
      setGenerating(null);
      return;
    }

    const { error } = await supabase.from('control_executions').insert(rows);
    setGenerating(null);
    if (error) { toast.error('Failed to generate executions'); return; }
    toast.success(`Generated ${rows.length} execution records for "${period.name}"`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Periods</h1>
          <p className="text-sm text-slate-500 mt-1">
            Define and manage ISAE 3402 Type 2 audit periods. This system tracks readiness — the external auditor issues the formal report.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          New Period
        </Button>
      </div>

      {/* Active period banner */}
      {activePeriod && (
        <Card className="p-5 border-green-200 bg-green-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">{activePeriod.name}</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {activePeriod.start_date} → {activePeriod.end_date}
                  {activePeriod.auditor && ` · Auditor: ${activePeriod.auditor}`}
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-green-800">{periodProgress(activePeriod)}%</p>
              <p className="text-xs text-green-600">{daysRemaining(activePeriod)} days remaining</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${periodProgress(activePeriod)}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {allPeriods.length === 0 && (
        <Card className="p-12 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">No audit periods yet</p>
          <p className="text-xs text-slate-500 mt-1">Create your first period to start tracking Type 2 control execution.</p>
          <Button onClick={openNew} className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Create First Period
          </Button>
        </Card>
      )}

      {/* Period list */}
      <div className="space-y-3">
        {allPeriods.map(period => (
          <Card key={period.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900 text-sm">{period.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(period.status)}`}>
                    {period.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {period.start_date} → {period.end_date}
                  </span>
                  {period.freeze_date && (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Freeze: {period.freeze_date}
                    </span>
                  )}
                  {period.report_due_date && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Report due: {period.report_due_date}
                    </span>
                  )}
                  {period.auditor && (
                    <span>Auditor: {period.auditor}</span>
                  )}
                </div>
                {period.status === 'active' && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full"
                        style={{ width: `${periodProgress(period)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">{periodProgress(period)}% · {daysRemaining(period)}d left</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {(period.status === 'planned' || period.status === 'active') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={generating === period.id}
                    onClick={() => handleGenerateExecutions(period)}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generating === period.id ? 'animate-spin' : ''}`} />
                    {generating === period.id ? 'Generating…' : 'Generate Executions'}
                  </Button>
                )}
                {period.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                    disabled={syncing === period.id}
                    onClick={() => handleSyncDeviations(period)}
                  >
                    <AlertCircle className={`w-3.5 h-3.5 ${syncing === period.id ? 'animate-pulse' : ''}`} />
                    {syncing === period.id ? 'Syncing…' : 'Sync Overdue'}
                  </Button>
                )}
                {period.status === 'planned' && (
                  <Button size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleActivate(period)}>
                    <Play className="w-3.5 h-3.5" />
                    Activate
                  </Button>
                )}
                {period.status === 'active' && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => handleClose(period)}>
                    <Lock className="w-3.5 h-3.5" />
                    Close Period
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEdit(period)}>
                  Edit
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPeriod ? 'Edit Audit Period' : 'New Audit Period'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Period name *</Label>
              <Input
                placeholder="e.g. ISAE 3402 Type 2 2026 H1"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End date *</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Freeze date</Label>
                <Input type="date" value={form.freeze_date} onChange={e => setForm(f => ({ ...f, freeze_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Report due date</Label>
                <Input type="date" value={form.report_due_date} onChange={e => setForm(f => ({ ...f, report_due_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>External auditor / firm</Label>
              <Input
                placeholder="e.g. Deloitte AS"
                value={form.auditor}
                onChange={e => setForm(f => ({ ...f, auditor: e.target.value }))}
              />
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 rounded p-3 flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
              After creating a period, use <strong>Generate Executions</strong> to auto-create control execution stubs based on each control's frequency.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingPeriod ? 'Save Changes' : 'Create Period'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
