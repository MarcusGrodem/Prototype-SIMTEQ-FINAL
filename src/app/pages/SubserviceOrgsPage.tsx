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
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Link2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import {
  ControlObjective,
  SubserviceOrg,
  SubserviceOrgCriticality,
  SubserviceOrgReviewStatus,
  SubserviceOrgStatus,
} from '../../lib/types';

type Form = {
  name: string;
  service_description: string;
  criticality: SubserviceOrgCriticality;
  assurance_report_type: string;
  last_report_date: string;
  next_review_date: string;
  status: SubserviceOrgStatus;
  in_scope: boolean;
  owner_name: string;
  review_status: SubserviceOrgReviewStatus;
  findings_summary: string;
  notes: string;
};

const emptyForm: Form = {
  name: '',
  service_description: '',
  criticality: 'medium',
  assurance_report_type: '',
  last_report_date: '',
  next_review_date: '',
  status: 'active',
  in_scope: true,
  owner_name: '',
  review_status: 'pending',
  findings_summary: '',
  notes: '',
};

const CRITICALITY_LABEL: Record<SubserviceOrgCriticality, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const CRITICALITY_STYLE: Record<SubserviceOrgCriticality, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-100',
  high: 'bg-amber-50 text-amber-800 border-amber-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_LABEL: Record<SubserviceOrgStatus, string> = {
  active: 'Active',
  under_review: 'Under Review',
  discontinued: 'Discontinued',
};

const STATUS_STYLE: Record<SubserviceOrgStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  under_review: 'bg-amber-50 text-amber-800 border-amber-200',
  discontinued: 'bg-slate-100 text-slate-500 border-slate-200',
};

const REVIEW_LABEL: Record<SubserviceOrgReviewStatus, string> = {
  pending: 'Review Pending',
  accepted: 'Accepted',
  accepted_with_findings: 'Accepted w/ Findings',
  rejected: 'Rejected',
};

const REVIEW_STYLE: Record<SubserviceOrgReviewStatus, string> = {
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  accepted_with_findings: 'bg-amber-50 text-amber-800 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

const REPORT_TYPE_SUGGESTIONS = [
  'ISAE 3402 Type II',
  'ISAE 3402 Type I',
  'SOC 2 Type II',
  'SOC 2 Type I',
  'ISO 27001',
  'ISO 27017',
  'ISO 27018',
  'None',
];

export function SubserviceOrgsPage() {
  const [orgs, setOrgs] = useState<SubserviceOrg[]>([]);
  const [objectives, setObjectives] = useState<ControlObjective[]>([]);
  const [linksByOrg, setLinksByOrg] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubserviceOrgStatus>('all');
  const [criticalityFilter, setCriticalityFilter] = useState<'all' | SubserviceOrgCriticality>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubserviceOrg | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [orgsRes, objRes, linkRes] = await Promise.all([
      supabase.from('subservice_orgs').select('*').order('name'),
      supabase.from('control_objectives').select('*').order('title'),
      supabase.from('subservice_org_objectives').select('*'),
    ]);

    if (orgsRes.error) {
      toast.error('Failed to load subservice organizations');
    }
    const orgRows = (orgsRes.data ?? []) as SubserviceOrg[];
    const objRows = (objRes.data ?? []) as ControlObjective[];
    const linkRows = (linkRes.data ?? []) as Array<{
      subservice_org_id: string;
      control_objective_id: string;
    }>;

    const grouped: Record<string, string[]> = {};
    for (const row of linkRows) {
      (grouped[row.subservice_org_id] ??= []).push(row.control_objective_id);
    }

    setOrgs(orgRows);
    setObjectives(objRows);
    setLinksByOrg(grouped);
    setLoading(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const objectiveById = useMemo(
    () => Object.fromEntries(objectives.map(o => [o.id, o])) as Record<string, ControlObjective>,
    [objectives],
  );

  const counts = useMemo(() => {
    const active = orgs.filter(o => o.status === 'active');
    return {
      total: orgs.length,
      active: active.length,
      critical: active.filter(o => o.criticality === 'critical' || o.criticality === 'high').length,
      reviewOverdue: active.filter(o => o.next_review_date && o.next_review_date < today).length,
      pendingReview: active.filter(o => o.review_status === 'pending').length,
      missingReports: active.filter(o => !o.last_report_date).length,
    };
  }, [orgs, today]);

  const filtered = orgs
    .filter(o => statusFilter === 'all' || o.status === statusFilter)
    .filter(o => criticalityFilter === 'all' || o.criticality === criticalityFilter)
    .filter(o => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        o.name.toLowerCase().includes(q) ||
        (o.service_description ?? '').toLowerCase().includes(q) ||
        (o.assurance_report_type ?? '').toLowerCase().includes(q) ||
        (o.owner_name ?? '').toLowerCase().includes(q)
      );
    });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedObjectiveIds([]);
    setDialogOpen(true);
  };

  const openEdit = (org: SubserviceOrg) => {
    setEditing(org);
    setForm({
      name: org.name,
      service_description: org.service_description ?? '',
      criticality: org.criticality,
      assurance_report_type: org.assurance_report_type ?? '',
      last_report_date: org.last_report_date ?? '',
      next_review_date: org.next_review_date ?? '',
      status: org.status,
      in_scope: org.in_scope,
      owner_name: org.owner_name ?? '',
      review_status: org.review_status,
      findings_summary: org.findings_summary ?? '',
      notes: org.notes ?? '',
    });
    setSelectedObjectiveIds(linksByOrg[org.id] ?? []);
    setDialogOpen(true);
  };

  const toggleObjective = (id: string) => {
    setSelectedObjectiveIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      service_description: form.service_description.trim() || null,
      criticality: form.criticality,
      assurance_report_type: form.assurance_report_type.trim() || null,
      last_report_date: form.last_report_date || null,
      next_review_date: form.next_review_date || null,
      status: form.status,
      in_scope: form.in_scope,
      owner_name: form.owner_name.trim() || null,
      review_status: form.review_status,
      findings_summary: form.findings_summary.trim() || null,
      notes: form.notes.trim() || null,
    };

    let orgId: string | undefined;
    if (editing) {
      const { error } = await supabase
        .from('subservice_orgs')
        .update(payload)
        .eq('id', editing.id);
      if (error) {
        toast.error('Failed to save');
        setSaving(false);
        return;
      }
      orgId = editing.id;
    } else {
      const { data, error } = await supabase
        .from('subservice_orgs')
        .insert(payload)
        .select('id')
        .single();
      if (error || !data) {
        toast.error('Failed to create');
        setSaving(false);
        return;
      }
      orgId = data.id as string;
    }

    if (orgId) {
      const existing = linksByOrg[orgId] ?? [];
      const toRemove = existing.filter(id => !selectedObjectiveIds.includes(id));
      const toAdd = selectedObjectiveIds.filter(id => !existing.includes(id));

      if (toRemove.length > 0) {
        await supabase
          .from('subservice_org_objectives')
          .delete()
          .eq('subservice_org_id', orgId)
          .in('control_objective_id', toRemove);
      }
      if (toAdd.length > 0) {
        await supabase
          .from('subservice_org_objectives')
          .insert(
            toAdd.map(control_objective_id => ({
              subservice_org_id: orgId!,
              control_objective_id,
            })),
          );
      }
    }

    toast.success(editing ? 'Subservice org updated' : 'Subservice org added');
    setDialogOpen(false);
    setEditing(null);
    setSaving(false);
    await loadData();
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm(`Delete ${editing.name}? Linked control objectives will be detached.`)) return;
    setSaving(true);
    const { error } = await supabase.from('subservice_orgs').delete().eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to delete');
      return;
    }
    toast.success('Subservice org deleted');
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
              Subservice Organizations
            </h1>
            <p className="text-xs text-slate-400 mt-2">
              Vendors and subservice providers in scope for the Type 2 engagement
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Add Subservice Org
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat icon={Building2} tone="slate" label="Total" value={counts.total} />
          <Stat icon={CheckCircle2} tone="emerald" label="Active" value={counts.active} />
          <Stat
            icon={ShieldAlert}
            tone={counts.critical > 0 ? 'amber' : 'slate'}
            label="High / Critical"
            value={counts.critical}
          />
          <Stat
            icon={CalendarClock}
            tone={counts.reviewOverdue > 0 ? 'red' : 'slate'}
            label="Review Overdue"
            value={counts.reviewOverdue}
          />
          <Stat
            icon={ClipboardList}
            tone={counts.pendingReview > 0 ? 'blue' : 'slate'}
            label="Pending Review"
            value={counts.pendingReview}
          />
          <Stat
            icon={AlertTriangle}
            tone={counts.missingReports > 0 ? 'amber' : 'slate'}
            label="Missing Reports"
            value={counts.missingReports}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[12rem] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, service, owner, or report type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | SubserviceOrgStatus)}
            className="h-9 px-3 border border-slate-200 rounded-md text-sm bg-white"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="under_review">Under review</option>
            <option value="discontinued">Discontinued</option>
          </select>
          <select
            value={criticalityFilter}
            onChange={e => setCriticalityFilter(e.target.value as 'all' | SubserviceOrgCriticality)}
            className="h-9 px-3 border border-slate-200 rounded-md text-sm bg-white"
          >
            <option value="all">All criticality</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="py-16 text-center border-slate-200 shadow-none">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">
              {orgs.length === 0
                ? 'No subservice organizations yet'
                : 'No subservice organizations match the current filters'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Register vendors and subservice providers your auditor expects to see covered.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(org => {
              const linkedObjectiveIds = linksByOrg[org.id] ?? [];
              const reviewOverdue =
                org.status === 'active' &&
                org.next_review_date != null &&
                org.next_review_date < today;
              return (
                <Card
                  key={org.id}
                  className={`p-5 shadow-none ${
                    reviewOverdue ? 'border-red-200 bg-red-50/40' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-sm font-semibold text-slate-900">{org.name}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${CRITICALITY_STYLE[org.criticality]}`}
                        >
                          {CRITICALITY_LABEL[org.criticality]}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLE[org.status]}`}
                        >
                          {STATUS_LABEL[org.status]}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${REVIEW_STYLE[org.review_status]}`}
                        >
                          {REVIEW_LABEL[org.review_status]}
                        </span>
                        {!org.in_scope && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-slate-100 text-slate-500 border-slate-200">
                            Out of scope
                          </span>
                        )}
                        {reviewOverdue && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">
                            Review overdue
                          </span>
                        )}
                      </div>
                      {org.service_description && (
                        <p className="text-sm text-slate-600 mb-2">{org.service_description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {org.assurance_report_type && (
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            {org.assurance_report_type}
                          </span>
                        )}
                        {org.owner_name && <span>Owner: {org.owner_name}</span>}
                        {org.last_report_date && <span>Last report: {org.last_report_date}</span>}
                        {org.next_review_date && (
                          <span className={reviewOverdue ? 'text-red-600 font-semibold' : ''}>
                            Next review: {org.next_review_date}
                          </span>
                        )}
                      </div>
                      {org.findings_summary && (
                        <p className="mt-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-2">
                          <span className="font-medium text-slate-900">Findings: </span>
                          {org.findings_summary}
                        </p>
                      )}
                      {linkedObjectiveIds.length > 0 && (
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
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 flex-shrink-0"
                      onClick={() => openEdit(org)}
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
          The auditor evaluates subservice organizations through either the carve-out or inclusive
          method. This register supports tracking — it does not replace the auditor's testing.
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit subservice org' : 'Add subservice org'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. AWS, Azure, Snowflake"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Service description</Label>
                <Textarea
                  value={form.service_description}
                  onChange={e => setForm(f => ({ ...f, service_description: e.target.value }))}
                  placeholder="What service do they provide and how does it relate to in-scope systems?"
                  className="min-h-20 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Criticality</Label>
                <select
                  value={form.criticality}
                  onChange={e =>
                    setForm(f => ({ ...f, criticality: e.target.value as SubserviceOrgCriticality }))
                  }
                  className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={e =>
                    setForm(f => ({ ...f, status: e.target.value as SubserviceOrgStatus }))
                  }
                  className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm bg-white"
                >
                  <option value="active">Active</option>
                  <option value="under_review">Under review</option>
                  <option value="discontinued">Discontinued</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Internal owner</Label>
                <Input
                  value={form.owner_name}
                  onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
                  placeholder="Name of accountable internal owner"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Assurance report type</Label>
                <Input
                  list="subservice-report-types"
                  value={form.assurance_report_type}
                  onChange={e => setForm(f => ({ ...f, assurance_report_type: e.target.value }))}
                  placeholder="e.g. ISAE 3402 Type II, SOC 2 Type II"
                />
                <datalist id="subservice-report-types">
                  {REPORT_TYPE_SUGGESTIONS.map(o => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label>Last report date</Label>
                <Input
                  type="date"
                  value={form.last_report_date}
                  onChange={e => setForm(f => ({ ...f, last_report_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Next review date</Label>
                <Input
                  type="date"
                  value={form.next_review_date}
                  onChange={e => setForm(f => ({ ...f, next_review_date: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Review status</Label>
                <select
                  value={form.review_status}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      review_status: e.target.value as SubserviceOrgReviewStatus,
                    }))
                  }
                  className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm bg-white"
                >
                  <option value="pending">Review pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="accepted_with_findings">Accepted with findings</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="space-y-1.5">
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
                <Label>Findings summary</Label>
                <Textarea
                  value={form.findings_summary}
                  onChange={e => setForm(f => ({ ...f, findings_summary: e.target.value }))}
                  placeholder="Notable findings, exceptions, or qualifications from the latest assurance report."
                  className="min-h-20 text-sm"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Internal notes for the engagement team."
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
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Add subservice org'}
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

export default SubserviceOrgsPage;
