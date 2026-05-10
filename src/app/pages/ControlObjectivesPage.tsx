import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Link2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Control, ControlExecution, ControlObjective, Deviation, Risk } from '../../lib/types';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import { StatusBadge } from '../components/StatusBadge';
import { getRiskScoreColor } from '../utils/riskUtils';

type ObjectiveForm = {
  title: string;
  risk_area: string;
  description: string;
  evidence_requirement: string;
  in_scope: boolean;
};

type MatrixRow = {
  control: Control;
  objective: ControlObjective | null;
  risk: Risk | null;
  execution: ControlExecution | null;
  openDeviationCount: number;
};

const emptyObjectiveForm: ObjectiveForm = {
  title: '',
  risk_area: '',
  description: '',
  evidence_requirement: '',
  in_scope: true,
};

const EXECUTION_STYLE: Record<string, string> = {
  scheduled: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  not_applicable: 'bg-slate-50 text-slate-500 border-slate-200',
};

const REVIEWER_STYLE: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const OPEN_DEVIATION_STATUSES = ['open', 'under_remediation', 'retesting'] as const;

export function ControlObjectivesPage() {
  const [objectives, setObjectives] = useState<ControlObjective[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [executions, setExecutions] = useState<ControlExecution[]>([]);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gapOnly, setGapOnly] = useState(false);
  const [savingLinkId, setSavingLinkId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<ControlObjective | null>(null);
  const [objectiveForm, setObjectiveForm] = useState<ObjectiveForm>(emptyObjectiveForm);
  const [savingObjective, setSavingObjective] = useState(false);

  const { activePeriod } = useAuditPeriod();

  useEffect(() => { loadData(); }, [activePeriod]);

  const loadData = async () => {
    setLoading(true);

    const executionRequest = activePeriod
      ? supabase
          .from('control_executions')
          .select('*')
          .eq('audit_period_id', activePeriod.id)
          .order('scheduled_due_date', { ascending: false })
      : Promise.resolve({ data: [], error: null });

    const [objRes, ctrlRes, riskRes, execRes, devRes] = await Promise.all([
      supabase.from('control_objectives').select('*').order('risk_area').order('title'),
      supabase.from('controls').select('*').order('id'),
      supabase.from('risks').select('*, risk_controls(control_id)').order('id'),
      executionRequest,
      supabase.from('deviations').select('*').order('created_at', { ascending: false }),
    ]);

    if (objRes.error) toast.error('Failed to load objectives');
    if (ctrlRes.error) toast.error('Failed to load controls');
    if (riskRes.error) toast.error('Failed to load risks');
    if (execRes.error) toast.error('Failed to load executions');
    if (devRes.error) toast.error('Failed to load deviations');

    setObjectives((objRes.data ?? []) as ControlObjective[]);
    setControls((ctrlRes.data ?? []) as Control[]);
    setRisks((riskRes.data ?? []) as Risk[]);
    setExecutions((execRes.data ?? []) as ControlExecution[]);
    setDeviations((devRes.data ?? []) as Deviation[]);
    setLoading(false);
  };

  const controlById = useMemo(
    () => new Map(controls.map(control => [control.id, control])),
    [controls]
  );

  const objectiveById = useMemo(
    () => new Map(objectives.map(objective => [objective.id, objective])),
    [objectives]
  );

  const risksByControl = useMemo(() => {
    const map = new Map<string, Risk[]>();
    risks.forEach(risk => {
      (risk.risk_controls ?? []).forEach(link => {
        const existing = map.get(link.control_id) ?? [];
        map.set(link.control_id, [...existing, risk]);
      });
    });
    return map;
  }, [risks]);

  const latestExecutionByControl = useMemo(() => {
    const map = new Map<string, ControlExecution>();
    executions.forEach(execution => {
      if (!map.has(execution.control_id)) map.set(execution.control_id, execution);
    });
    return map;
  }, [executions]);

  const openDeviationCountByControl = useMemo(() => {
    const map = new Map<string, number>();
    deviations
      .filter(deviation => OPEN_DEVIATION_STATUSES.includes(deviation.status as typeof OPEN_DEVIATION_STATUSES[number]))
      .forEach(deviation => map.set(deviation.control_id, (map.get(deviation.control_id) ?? 0) + 1));
    return map;
  }, [deviations]);

  const controlsByObjectiveId = useMemo(() => {
    const map = new Map<string, Control[]>();
    controls.forEach(control => {
      if (!control.control_objective_id) return;
      const existing = map.get(control.control_objective_id) ?? [];
      map.set(control.control_objective_id, [...existing, control]);
    });
    return map;
  }, [controls]);

  const matrixRows = useMemo<MatrixRow[]>(() => {
    return controls.flatMap(control => {
      const linkedRisks = risksByControl.get(control.id) ?? [];
      const base = {
        control,
        objective: control.control_objective_id ? objectiveById.get(control.control_objective_id) ?? null : null,
        execution: latestExecutionByControl.get(control.id) ?? null,
        openDeviationCount: openDeviationCountByControl.get(control.id) ?? 0,
      };

      if (linkedRisks.length === 0) return [{ ...base, risk: null }];
      return linkedRisks.map(risk => ({ ...base, risk }));
    });
  }, [controls, latestExecutionByControl, objectiveById, openDeviationCountByControl, risksByControl]);

  const controlsWithoutObjectives = controls.filter(control => !control.control_objective_id);
  const objectivesWithoutControls = objectives.filter(objective =>
    objective.in_scope && (controlsByObjectiveId.get(objective.id)?.length ?? 0) === 0
  );
  const highRisksWithoutActiveControls = risks.filter(risk => {
    if (risk.risk_score < 7) return false;
    const linkedControls = (risk.risk_controls ?? [])
      .map(link => controlById.get(link.control_id))
      .filter(Boolean) as Control[];
    return linkedControls.length === 0 || !linkedControls.some(control => control.status !== 'Overdue');
  });

  const visibleRows = matrixRows
    .filter(row => {
      const haystack = [
        row.objective?.title,
        row.objective?.risk_area,
        row.risk?.title,
        row.control.title,
        row.control.owner_name,
        row.control.id,
      ].filter(Boolean).join(' ').toLowerCase();
      return !search || haystack.includes(search.toLowerCase());
    })
    .filter(row => !gapOnly || !row.objective || row.openDeviationCount > 0 || row.control.status === 'Overdue' || (row.risk?.risk_score ?? 0) >= 7);

  const activeObjectives = objectives.filter(objective => objective.in_scope).length;
  const gapCount = controlsWithoutObjectives.length + objectivesWithoutControls.length + highRisksWithoutActiveControls.length;

  const openCreateDialog = () => {
    setEditingObjective(null);
    setObjectiveForm(emptyObjectiveForm);
    setDialogOpen(true);
  };

  const openEditDialog = (objective: ControlObjective) => {
    setEditingObjective(objective);
    setObjectiveForm({
      title: objective.title,
      risk_area: objective.risk_area ?? '',
      description: objective.description ?? '',
      evidence_requirement: objective.evidence_requirement ?? '',
      in_scope: objective.in_scope,
    });
    setDialogOpen(true);
  };

  const setObjectiveField = <K extends keyof ObjectiveForm>(field: K, value: ObjectiveForm[K]) => {
    setObjectiveForm(prev => ({ ...prev, [field]: value }));
  };

  const saveObjective = async () => {
    if (!objectiveForm.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSavingObjective(true);
    const payload = {
      title: objectiveForm.title.trim(),
      risk_area: objectiveForm.risk_area.trim() || null,
      description: objectiveForm.description.trim() || null,
      evidence_requirement: objectiveForm.evidence_requirement.trim() || null,
      in_scope: objectiveForm.in_scope,
    };

    const { error } = editingObjective
      ? await supabase.from('control_objectives').update(payload).eq('id', editingObjective.id)
      : await supabase.from('control_objectives').insert(payload);

    setSavingObjective(false);
    if (error) {
      toast.error(editingObjective ? 'Failed to update objective' : 'Failed to create objective');
      return;
    }

    toast.success(editingObjective ? 'Objective updated' : 'Objective created');
    setDialogOpen(false);
    setEditingObjective(null);
    setObjectiveForm(emptyObjectiveForm);
    loadData();
  };

  const toggleObjectiveScope = async (objective: ControlObjective) => {
    const { error } = await supabase
      .from('control_objectives')
      .update({ in_scope: !objective.in_scope })
      .eq('id', objective.id);

    if (error) {
      toast.error('Failed to update scope');
      return;
    }

    toast.success(!objective.in_scope ? 'Objective in scope' : 'Objective archived');
    loadData();
  };

  const updateControlObjective = async (control: Control, value: string) => {
    setSavingLinkId(control.id);
    const nextObjectiveId = value === '__none__' ? null : value;
    const { error } = await supabase
      .from('controls')
      .update({ control_objective_id: nextObjectiveId })
      .eq('id', control.id);

    setSavingLinkId(null);
    if (error) {
      toast.error('Failed to link control');
      return;
    }

    toast.success(nextObjectiveId ? 'Control linked' : 'Objective link removed');
    setControls(prev => prev.map(item =>
      item.id === control.id ? { ...item, control_objective_id: nextObjectiveId } : item
    ));
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Control Objectives & RCM</h1>
            <p className="text-xs text-slate-400 mt-2">
              {activePeriod ? `Active period: ${activePeriod.name}` : 'No active audit period'}
            </p>
          </div>
          <Button size="sm" onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" />
            Add Objective
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200 shadow-none">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs font-medium text-slate-500">Objectives</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{activeObjectives}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-slate-200 shadow-none">
            <div className="flex items-center gap-3">
              <Link2 className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs font-medium text-slate-500">Mapped Controls</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{controls.length - controlsWithoutObjectives.length}</p>
              </div>
            </div>
          </Card>
          <Card className={`p-4 shadow-none ${gapCount > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-5 h-5 ${gapCount > 0 ? 'text-red-600' : 'text-slate-400'}`} />
              <div>
                <p className={`text-xs font-medium ${gapCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>Gaps</p>
                <p className={`text-2xl font-bold tabular-nums ${gapCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>{gapCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-slate-200 shadow-none">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs font-medium text-slate-500">Matrix Rows</p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{matrixRows.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <GapCard
            title="Controls without objectives"
            count={controlsWithoutObjectives.length}
            items={controlsWithoutObjectives.map(control => `${control.id} ${control.title}`)}
          />
          <GapCard
            title="High risks without active controls"
            count={highRisksWithoutActiveControls.length}
            items={highRisksWithoutActiveControls.map(risk => `${risk.id} ${risk.title}`)}
          />
          <GapCard
            title="Objectives without controls"
            count={objectivesWithoutControls.length}
            items={objectivesWithoutControls.map(objective => objective.title)}
          />
        </div>

        <Card className="border-slate-200 shadow-none overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Objective Library</h2>
              <p className="text-xs text-slate-400 mt-1">Create, edit, and scope control objectives.</p>
            </div>
            <Button variant="outline" size="sm" onClick={openCreateDialog} className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Objective</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Area</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Evidence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Controls</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Scope</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">Loading...</td></tr>
                ) : objectives.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">No objectives yet.</td></tr>
                ) : objectives.map(objective => {
                  const mappedControls = controlsByObjectiveId.get(objective.id) ?? [];
                  const noControls = objective.in_scope && mappedControls.length === 0;
                  return (
                    <tr key={objective.id} className={noControls ? 'bg-red-50/60' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3 min-w-[260px]">
                        <p className="text-sm font-medium text-slate-900">{objective.title}</p>
                        {objective.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{objective.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">{objective.risk_area || 'Unassigned'}</span>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <span className="text-xs text-slate-600 line-clamp-2">{objective.evidence_requirement || 'Not set'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={noControls ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'}>
                          {mappedControls.length} mapped
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleObjectiveScope(objective)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium cursor-pointer ${
                            objective.in_scope
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {objective.in_scope ? <CheckCircle2 className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                          {objective.in_scope ? 'In scope' : 'Archived'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(objective)}
                          title="Edit objective"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border-slate-200 shadow-none overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Risk-Control Matrix</h2>
              <p className="text-xs text-slate-400 mt-1">Trace objective, risk, control, execution, evidence, and exceptions.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search matrix..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Button
                variant={gapOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGapOnly(prev => !prev)}
                className={gapOnly ? 'bg-slate-900 text-white cursor-pointer' : 'border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'}
              >
                Gaps
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Control Objective</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Control</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Frequency</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Evidence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Execution</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Exceptions</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Loading...</td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">No matrix rows match the current filter.</td></tr>
                ) : visibleRows.map(row => {
                  const controlGap = !row.objective;
                  const exceptionGap = row.openDeviationCount > 0;
                  const rowKey = `${row.control.id}-${row.risk?.id ?? 'no-risk'}`;

                  return (
                    <tr key={rowKey} className={controlGap || exceptionGap || row.control.status === 'Overdue' ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3 align-top min-w-[220px]">
                        <Select
                          value={row.control.control_objective_id ?? '__none__'}
                          onValueChange={value => updateControlObjective(row.control, value)}
                          disabled={savingLinkId === row.control.id}
                        >
                          <SelectTrigger className={`h-8 bg-white text-xs ${controlGap ? 'border-red-200 text-red-700' : 'border-slate-200'}`}>
                            <SelectValue placeholder="No objective" />
                          </SelectTrigger>
                          <SelectContent className="bg-white text-slate-900">
                            <SelectItem value="__none__">No objective</SelectItem>
                            {objectives.map(objective => (
                              <SelectItem key={objective.id} value={objective.id}>
                                {objective.in_scope ? objective.title : `${objective.title} (archived)`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {controlGap && (
                          <p className="mt-1 text-[11px] font-medium text-red-600">Missing objective</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top min-w-[220px]">
                        {row.risk ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">{row.risk.id}</span>
                              <Badge variant="outline" className={`text-xs font-bold border ${getRiskScoreColor(row.risk.risk_score)}`}>
                                {row.risk.risk_score}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm font-medium text-slate-900 line-clamp-2">{row.risk.title}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No linked risk</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top min-w-[240px]">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{row.control.id}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-900 line-clamp-2">{row.control.title}</p>
                            <div className="mt-1"><StatusBadge status={row.control.status} /></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="text-sm text-slate-700">{row.control.frequency}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="text-sm text-slate-700 whitespace-nowrap">{row.control.owner_name}</span>
                      </td>
                      <td className="px-4 py-3 align-top max-w-[220px]">
                        <span className="text-xs text-slate-600 line-clamp-3">{row.objective?.evidence_requirement || 'Not set'}</span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {row.execution ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className={`text-xs border ${EXECUTION_STYLE[row.execution.status] ?? EXECUTION_STYLE.scheduled}`}>
                              {row.execution.status.replace('_', ' ')}
                            </Badge>
                            <p className="text-[11px] text-slate-400 tabular-nums">Due {row.execution.scheduled_due_date}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">{activePeriod ? 'No execution' : row.control.status}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {row.openDeviationCount > 0 ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {row.openDeviationCount} open
                          </Badge>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <XCircle className="w-3 h-3 text-slate-300" />
                            None
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {row.execution ? (
                          <Badge variant="outline" className={`text-xs border ${REVIEWER_STYLE[row.execution.reviewer_status] ?? REVIEWER_STYLE.pending}`}>
                            {row.execution.reviewer_status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>{editingObjective ? 'Edit objective' : 'Add objective'}</DialogTitle>
            <DialogDescription>
              Define the control objective and expected evidence for the RCM.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="objective-title" className="text-slate-700">Title *</Label>
              <Input
                id="objective-title"
                value={objectiveForm.title}
                onChange={event => setObjectiveField('title', event.target.value)}
                className="mt-1.5 bg-white text-slate-900 border-slate-300"
              />
            </div>

            <div>
              <Label htmlFor="objective-area" className="text-slate-700">Risk area</Label>
              <Input
                id="objective-area"
                value={objectiveForm.risk_area}
                onChange={event => setObjectiveField('risk_area', event.target.value)}
                placeholder="Access, change, operations..."
                className="mt-1.5 bg-white text-slate-900 border-slate-300"
              />
            </div>

            <div>
              <Label htmlFor="objective-description" className="text-slate-700">Description</Label>
              <Textarea
                id="objective-description"
                value={objectiveForm.description}
                onChange={event => setObjectiveField('description', event.target.value)}
                className="mt-1.5 bg-white text-slate-900 border-slate-300"
              />
            </div>

            <div>
              <Label htmlFor="objective-evidence" className="text-slate-700">Evidence requirement</Label>
              <Textarea
                id="objective-evidence"
                value={objectiveForm.evidence_requirement}
                onChange={event => setObjectiveField('evidence_requirement', event.target.value)}
                placeholder="Expected evidence for mapped controls..."
                className="mt-1.5 bg-white text-slate-900 border-slate-300"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">In scope</p>
                <p className="text-xs text-slate-400">Archived objectives remain visible for historical mappings.</p>
              </div>
              <Switch
                checked={objectiveForm.in_scope}
                onCheckedChange={checked => setObjectiveField('in_scope', checked)}
                className="data-[state=checked]:bg-slate-900 data-[state=unchecked]:bg-slate-300"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
              Cancel
            </Button>
            <Button onClick={saveObjective} disabled={savingObjective} className="bg-slate-900 hover:bg-slate-800 text-white cursor-pointer">
              {savingObjective ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GapCard({ title, count, items }: { title: string; count: number; items: string[] }) {
  const hasGap = count > 0;

  return (
    <Card className={`p-4 shadow-none ${hasGap ? 'border-red-200 bg-red-50/70' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${hasGap ? 'text-red-700' : 'text-slate-500'}`}>{title}</p>
          <p className={`text-2xl font-bold tabular-nums mt-2 ${hasGap ? 'text-red-700' : 'text-slate-900'}`}>{count}</p>
        </div>
        {hasGap ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <CheckCircle2 className="w-5 h-5 text-green-600" />}
      </div>
      <div className="mt-3 min-h-[3rem]">
        {hasGap ? (
          <ul className="space-y-1">
            {items.slice(0, 3).map(item => (
              <li key={item} className="text-xs text-red-700 line-clamp-1">{item}</li>
            ))}
            {items.length > 3 && (
              <li className="text-xs font-medium text-red-700">+{items.length - 3} more</li>
            )}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No gap detected.</p>
        )}
      </div>
    </Card>
  );
}
