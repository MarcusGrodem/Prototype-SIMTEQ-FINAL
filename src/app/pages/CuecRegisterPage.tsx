import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  CheckCircle2,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Unlink,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import {
  ControlObjective,
  Cuec,
  CuecCategory,
  CuecStatus,
} from '../../lib/types';

type Form = {
  code: string;
  title: string;
  description: string;
  category: CuecCategory;
  responsible_party: string;
  status: CuecStatus;
  in_scope: boolean;
  notes: string;
};

const emptyForm: Form = {
  code: '',
  title: '',
  description: '',
  category: 'other',
  responsible_party: '',
  status: 'active',
  in_scope: true,
  notes: '',
};

const CATEGORY_LABEL: Record<CuecCategory, string> = {
  access: 'Access',
  data: 'Data',
  change: 'Change',
  operations: 'Operations',
  other: 'Other',
};

const CATEGORY_STYLE: Record<CuecCategory, string> = {
  access: 'bg-blue-50 text-blue-700 border-blue-100',
  data: 'bg-purple-50 text-purple-700 border-purple-100',
  change: 'bg-amber-50 text-amber-800 border-amber-200',
  operations: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_LABEL: Record<CuecStatus, string> = {
  active: 'Active',
  retired: 'Retired',
};

const STATUS_STYLE: Record<CuecStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  retired: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function CuecRegisterPage() {
  const [cuecs, setCuecs] = useState<Cuec[]>([]);
  const [objectives, setObjectives] = useState<ControlObjective[]>([]);
  const [linksByCuec, setLinksByCuec] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CuecStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | CuecCategory>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cuec | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [cuecsRes, objRes, linkRes] = await Promise.all([
      supabase.from('cuecs').select('*').order('code'),
      supabase.from('control_objectives').select('*').order('title'),
      supabase.from('cuec_control_objectives').select('*'),
    ]);

    if (cuecsRes.error) {
      toast.error('Failed to load CUECs');
    }
    const cuecRows = (cuecsRes.data ?? []) as Cuec[];
    const objRows = (objRes.data ?? []) as ControlObjective[];
    const linkRows = (linkRes.data ?? []) as Array<{
      cuec_id: string;
      control_objective_id: string;
    }>;

    const grouped: Record<string, string[]> = {};
    for (const row of linkRows) {
      (grouped[row.cuec_id] ??= []).push(row.control_objective_id);
    }

    setCuecs(cuecRows);
    setObjectives(objRows);
    setLinksByCuec(grouped);
    setLoading(false);
  };

  const objectiveById = useMemo(
    () => Object.fromEntries(objectives.map(o => [o.id, o])) as Record<string, ControlObjective>,
    [objectives],
  );

  const counts = useMemo(() => {
    const active = cuecs.filter(c => c.status === 'active');
    const linked = cuecs.filter(c => (linksByCuec[c.id] ?? []).length > 0);
    return {
      total: cuecs.length,
      active: active.length,
      inScope: active.filter(c => c.in_scope).length,
      linked: linked.length,
      unlinked: cuecs.length - linked.length,
    };
  }, [cuecs, linksByCuec]);

  const filtered = cuecs
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => categoryFilter === 'all' || c.category === categoryFilter)
    .filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q) ||
        (c.responsible_party ?? '').toLowerCase().includes(q)
      );
    });

  const suggestNextCode = () => {
    const nums = cuecs
      .map(c => /^CUEC-(\d+)$/i.exec(c.code))
      .filter((m): m is RegExpExecArray => Boolean(m))
      .map(m => parseInt(m[1], 10));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `CUEC-${String(next).padStart(2, '0')}`;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, code: suggestNextCode() });
    setSelectedObjectiveIds([]);
    setDialogOpen(true);
  };

  const openEdit = (cuec: Cuec) => {
    setEditing(cuec);
    setForm({
      code: cuec.code,
      title: cuec.title,
      description: cuec.description ?? '',
      category: cuec.category,
      responsible_party: cuec.responsible_party ?? '',
      status: cuec.status,
      in_scope: cuec.in_scope,
      notes: cuec.notes ?? '',
    });
    setSelectedObjectiveIds(linksByCuec[cuec.id] ?? []);
    setDialogOpen(true);
  };

  const toggleObjective = (id: string) => {
    setSelectedObjectiveIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast.error('Code is required');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);

    const payload = {
      code: form.code.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      responsible_party: form.responsible_party.trim() || null,
      status: form.status,
      in_scope: form.in_scope,
      notes: form.notes.trim() || null,
    };

    let cuecId: string | undefined;
    if (editing) {
      const { error } = await supabase.from('cuecs').update(payload).eq('id', editing.id);
      if (error) {
        toast.error(error.message.includes('cuecs_code_unique') ? 'Code already in use' : 'Failed to save');
        setSaving(false);
        return;
      }
      cuecId = editing.id;
    } else {
      const { data, error } = await supabase
        .from('cuecs')
        .insert(payload)
        .select('id')
        .single();
      if (error || !data) {
        toast.error(
          error?.message?.includes('cuecs_code_unique') ? 'Code already in use' : 'Failed to create',
        );
        setSaving(false);
        return;
      }
      cuecId = data.id as string;
    }

    if (cuecId) {
      const existing = linksByCuec[cuecId] ?? [];
      const toRemove = existing.filter(id => !selectedObjectiveIds.includes(id));
      const toAdd = selectedObjectiveIds.filter(id => !existing.includes(id));

      if (toRemove.length > 0) {
        await supabase
          .from('cuec_control_objectives')
          .delete()
          .eq('cuec_id', cuecId)
          .in('control_objective_id', toRemove);
      }
      if (toAdd.length > 0) {
        await supabase.from('cuec_control_objectives').insert(
          toAdd.map(control_objective_id => ({
            cuec_id: cuecId!,
            control_objective_id,
          })),
        );
      }
    }

    toast.success(editing ? 'CUEC updated' : 'CUEC added');
    setDialogOpen(false);
    setEditing(null);
    setSaving(false);
    await loadData();
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`Delete ${editing.code}? Linked control objectives will be detached.`)) return;
    setSaving(true);
    const { error } = await supabase.from('cuecs').delete().eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to delete');
      return;
    }
    toast.success('CUEC deleted');
    setDialogOpen(false);
    setEditing(null);
    await loadData();
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">
              CUEC Register
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Complementary User Entity Controls — controls the customer must operate for our
              controls to achieve the related control objectives
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Add CUEC
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat icon={ListChecks} tone="slate" label="Total" value={counts.total} />
          <Stat icon={CheckCircle2} tone="emerald" label="Active" value={counts.active} />
          <Stat icon={ShieldAlert} tone="blue" label="In Scope" value={counts.inScope} />
          <Stat icon={Link2} tone="emerald" label="Linked to Objectives" value={counts.linked} />
          <Stat
            icon={Unlink}
            tone={counts.unlinked > 0 ? 'amber' : 'slate'}
            label="Unlinked"
            value={counts.unlinked}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[12rem] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by code, title, description, or responsible party..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | CuecStatus)}
            className="h-9 px-3 border border-slate-200 rounded-md text-sm bg-white"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="retired">Retired</option>
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as 'all' | CuecCategory)}
            className="h-9 px-3 border border-slate-200 rounded-md text-sm bg-white"
          >
            <option value="all">All categories</option>
            <option value="access">Access</option>
            <option value="data">Data</option>
            <option value="change">Change</option>
            <option value="operations">Operations</option>
            <option value="other">Other</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="py-16 text-center border-slate-200 shadow-none">
            <ListChecks className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">
              {cuecs.length === 0
                ? 'No CUECs registered yet'
                : 'No CUECs match the current filters'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              CUECs are controls the customer (user entity) must operate so the service organization's
              controls can achieve the related control objectives. Document the customer's part of the
              shared control responsibility.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(cuec => {
              const linkedObjectiveIds = linksByCuec[cuec.id] ?? [];
              return (
                <Card key={cuec.id} className="p-5 shadow-none border-slate-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-semibold">
                          {cuec.code}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-900">{cuec.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${CATEGORY_STYLE[cuec.category]}`}
                        >
                          {CATEGORY_LABEL[cuec.category]}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLE[cuec.status]}`}
                        >
                          {STATUS_LABEL[cuec.status]}
                        </span>
                        {!cuec.in_scope && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-slate-100 text-slate-500 border-slate-200">
                            Out of scope
                          </span>
                        )}
                      </div>
                      {cuec.description && (
                        <p className="text-sm text-slate-600 mb-2">{cuec.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {cuec.responsible_party && (
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Responsible: {cuec.responsible_party}
                          </span>
                        )}
                      </div>
                      {cuec.notes && (
                        <p className="mt-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-2">
                          <span className="font-medium text-slate-900">Notes: </span>
                          {cuec.notes}
                        </p>
                      )}
                      {linkedObjectiveIds.length > 0 ? (
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Link2 className="w-3 h-3" />
                            Objectives:
                          </span>
                          {linkedObjectiveIds.map(id => (
                            <span
                              key={id}
                              className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100"
                            >
                              {objectiveById[id]?.title ?? 'Unknown'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 inline-flex items-center gap-1 text-xs text-amber-700">
                          <Unlink className="w-3 h-3" />
                          Not linked to any control objective
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 flex-shrink-0"
                      onClick={() => openEdit(cuec)}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-xs text-slate-400 italic">
          CUECs document the customer's portion of shared control responsibility. The auditor expects
          them to be disclosed in the Type 2 report so user entities can design complementary controls.
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit CUEC' : 'Add CUEC'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="CUEC-01"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as CuecCategory }))}
                  className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm bg-white"
                >
                  <option value="access">Access</option>
                  <option value="data">Data</option>
                  <option value="change">Change</option>
                  <option value="operations">Operations</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Customer maintains the integrity of user access to the service"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What must the customer do, and why is it required for our controls to operate effectively?"
                  className="min-h-24 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Responsible party</Label>
                <Input
                  value={form.responsible_party}
                  onChange={e => setForm(f => ({ ...f, responsible_party: e.target.value }))}
                  placeholder="e.g. Customer IT admin, Customer security team"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as CuecStatus }))}
                  className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm bg-white"
                >
                  <option value="active">Active</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>In scope</Label>
                <label className="flex items-center gap-2 h-9 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.in_scope}
                    onChange={e => setForm(f => ({ ...f, in_scope: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Include in current engagement
                </label>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Implementation guidance, exceptions, or context for the engagement team."
                  className="min-h-20 text-sm"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Linked control objectives</Label>
                {objectives.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No control objectives defined yet. Create objectives on the RCM page first.
                  </p>
                ) : (
                  <div className="border border-slate-200 rounded-md p-3 max-h-48 overflow-y-auto space-y-1">
                    {objectives.map(obj => (
                      <label
                        key={obj.id}
                        className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedObjectiveIds.includes(obj.id)}
                          onChange={() => toggleObjective(obj.id)}
                          className="mt-0.5 w-4 h-4"
                        />
                        <span>
                          <span className="font-medium">{obj.title}</span>
                          {obj.risk_area && (
                            <span className="text-xs text-slate-400 ml-2">{obj.risk_area}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 sm:justify-between">
            <div>
              {editing && (
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add CUEC'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: 'slate' | 'emerald' | 'amber' | 'red' | 'blue';
  label: string;
  value: number;
}) {
  const toneStyles: Record<typeof tone, { card: string; icon: string; value: string }> = {
    slate: { card: 'border-slate-200', icon: 'text-slate-400', value: 'text-slate-900' },
    emerald: { card: 'border-slate-200', icon: 'text-emerald-500', value: 'text-slate-900' },
    amber: { card: 'border-amber-200 bg-amber-50/30', icon: 'text-amber-600', value: 'text-amber-800' },
    red: { card: 'border-red-200 bg-red-50/30', icon: 'text-red-600', value: 'text-red-700' },
    blue: { card: 'border-slate-200', icon: 'text-blue-500', value: 'text-slate-900' },
  };
  const s = toneStyles[tone];
  return (
    <Card className={`p-4 shadow-none ${s.card}`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${s.icon}`} />
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-2xl font-bold ${s.value}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}

export default CuecRegisterPage;
