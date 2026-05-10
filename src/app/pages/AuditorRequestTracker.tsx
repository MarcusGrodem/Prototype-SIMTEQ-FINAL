import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
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
  ArrowRight,
  CheckCircle2,
  Clock,
  FileQuestion,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { AuditorRequest, Control } from '../../lib/types';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import { useAuth } from '../../contexts/AuthContext';

type RequestStatus = AuditorRequest['status'];

interface RequestWithControl extends AuditorRequest {
  control_title?: string;
}

const STATUSES: RequestStatus[] = ['open', 'answered', 'accepted', 'closed'];

const STATUS_LABEL: Record<RequestStatus, string> = {
  open: 'Open',
  answered: 'Answered',
  accepted: 'Accepted',
  closed: 'Closed',
};

const STATUS_STYLE: Record<RequestStatus, string> = {
  open: 'bg-red-50 text-red-700 border-red-100',
  answered: 'bg-blue-50 text-blue-700 border-blue-100',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const emptyForm = {
  auditor: '',
  request_text: '',
  related_control: '',
  owner_name: '',
  due_date: '',
  response: '',
  submitted_date: '',
  status: 'open' as RequestStatus,
};

export function AuditorRequestTracker() {
  const { activePeriod, loading: periodLoading } = useAuditPeriod();
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RequestWithControl[]>([]);
  const [controls, setControls] = useState<Pick<Control, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RequestStatus>('open');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<RequestWithControl | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [activePeriod]);

  const loadData = async () => {
    setLoading(true);
    if (!activePeriod) {
      setRequests([]);
      setControls([]);
      setLoading(false);
      return;
    }

    const [reqRes, ctrlRes] = await Promise.all([
      supabase
        .from('auditor_requests')
        .select('*')
        .eq('audit_period_id', activePeriod.id)
        .order('submitted_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('controls').select('id, title').order('id'),
    ]);

    const controlRows = (ctrlRes.data ?? []) as Pick<Control, 'id' | 'title'>[];
    const controlMap = Object.fromEntries(controlRows.map(c => [c.id, c.title]));
    setControls(controlRows);
    setRequests(((reqRes.data ?? []) as AuditorRequest[]).map(req => ({
      ...req,
      control_title: req.related_control ? controlMap[req.related_control] : undefined,
    })));
    setLoading(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const counts = useMemo(() => ({
    open: requests.filter(r => r.status === 'open').length,
    answered: requests.filter(r => r.status === 'answered').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    closed: requests.filter(r => r.status === 'closed').length,
  }), [requests]);

  const overdueOpen = requests.filter(r => r.status === 'open' && r.due_date && r.due_date < today).length;
  const dueSoonOpen = requests.filter(r => {
    if (r.status !== 'open' || !r.due_date || r.due_date < today) return false;
    const due = new Date(`${r.due_date}T00:00:00`).getTime();
    const now = new Date(`${today}T00:00:00`).getTime();
    return Math.round((due - now) / 86_400_000) <= 7;
  }).length;

  const filtered = requests
    .filter(r => r.status === activeTab)
    .filter(r =>
      !search ||
      r.request_text.toLowerCase().includes(search.toLowerCase()) ||
      (r.auditor ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.owner_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.related_control ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.control_title ?? '').toLowerCase().includes(search.toLowerCase())
    );

  const openCreate = () => {
    setForm({
      ...emptyForm,
      auditor: activePeriod?.auditor ?? '',
      owner_name: profile?.full_name ?? '',
      submitted_date: today,
    });
    setEditing(null);
    setCreateOpen(true);
  };

  const openEdit = (request: RequestWithControl) => {
    setEditing(request);
    setForm({
      auditor: request.auditor ?? '',
      request_text: request.request_text,
      related_control: request.related_control ?? '',
      owner_name: request.owner_name ?? '',
      due_date: request.due_date ?? '',
      response: request.response ?? '',
      submitted_date: request.submitted_date,
      status: request.status,
    });
    setEditOpen(true);
  };

  const handleCreate = async () => {
    if (!activePeriod) return;
    if (!form.request_text.trim()) {
      toast.error('Request text is required');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('auditor_requests').insert({
      audit_period_id: activePeriod.id,
      auditor: form.auditor.trim() || null,
      request_text: form.request_text.trim(),
      related_control: form.related_control || null,
      owner_name: form.owner_name.trim() || null,
      due_date: form.due_date || null,
      response: form.response.trim() || null,
      submitted_date: form.submitted_date || today,
      status: form.response.trim() ? 'answered' : 'open',
    });
    setSaving(false);

    if (error) {
      toast.error('Failed to create request');
      return;
    }
    toast.success('Auditor request created');
    setCreateOpen(false);
    await loadData();
  };

  const handleUpdate = async (nextStatus?: RequestStatus) => {
    if (!editing) return;
    if (!form.request_text.trim()) {
      toast.error('Request text is required');
      return;
    }

    const status = nextStatus ?? form.status;
    setSaving(true);
    const { error } = await supabase.from('auditor_requests').update({
      auditor: form.auditor.trim() || null,
      request_text: form.request_text.trim(),
      related_control: form.related_control || null,
      owner_name: form.owner_name.trim() || null,
      due_date: form.due_date || null,
      response: form.response.trim() || null,
      submitted_date: form.submitted_date || today,
      status,
    }).eq('id', editing.id);
    setSaving(false);

    if (error) {
      toast.error('Failed to update request');
      return;
    }
    toast.success('Auditor request updated');
    setEditOpen(false);
    setEditing(null);
    await loadData();
  };

  const quickStatus = async (request: RequestWithControl, status: RequestStatus) => {
    const { error } = await supabase.from('auditor_requests').update({ status }).eq('id', request.id);
    if (error) {
      toast.error('Failed to update status');
      return;
    }
    toast.success(`Request marked ${STATUS_LABEL[status].toLowerCase()}`);
    await loadData();
  };

  if (!periodLoading && !activePeriod) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="bg-white border-b border-slate-200 px-8 py-5">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Auditor Requests</h1>
            <p className="text-xs text-slate-400 mt-2">Request and response tracker for Type 2 fieldwork</p>
          </div>
        </div>
        <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
          <Card className="p-12 text-center border-slate-200 shadow-none">
            <FileQuestion className="w-10 h-10 mx-auto mb-4 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No active audit period</p>
            <p className="text-xs text-slate-500 mt-1">Activate an audit period before tracking auditor requests.</p>
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

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Auditor Requests</h1>
            <p className="text-xs text-slate-400 mt-2">
              {activePeriod ? `${activePeriod.name} · ${activePeriod.start_date} to ${activePeriod.end_date}` : 'No active audit period'}
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            New Request
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card className={`p-4 ${overdueOpen > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <Clock className={`w-5 h-5 ${overdueOpen > 0 ? 'text-red-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs text-slate-500">Overdue Open</p>
                <p className={`text-2xl font-bold ${overdueOpen > 0 ? 'text-red-700' : 'text-slate-900'}`}>{overdueOpen}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FileQuestion className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-slate-500">Open</p>
                <p className="text-2xl font-bold text-slate-900">{counts.open}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquareText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-slate-500">Answered</p>
                <p className="text-2xl font-bold text-slate-900">{counts.answered}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-xs text-slate-500">Accepted / Closed</p>
                <p className="text-2xl font-bold text-slate-900">{counts.accepted + counts.closed}</p>
              </div>
            </div>
          </Card>
        </div>

        {dueSoonOpen > 0 && overdueOpen === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {dueSoonOpen} open request{dueSoonOpen > 1 ? 's are' : ' is'} due within 7 days.
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {STATUSES.map(status => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === status ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {STATUS_LABEL[status]} ({counts[status]})
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search requests..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {loading || periodLoading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="py-16 text-center border-slate-200 shadow-none">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No {STATUS_LABEL[activeTab].toLowerCase()} requests</p>
            <p className="text-xs text-slate-400 mt-1">Create a request when the auditor asks for evidence, context, or clarification.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(request => {
              const dueState = getDueState(request, today);
              return (
                <Card key={request.id} className={`p-5 shadow-none ${dueState === 'overdue' ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLE[request.status]}`}>
                          {STATUS_LABEL[request.status]}
                        </span>
                        {dueState !== 'none' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            dueState === 'overdue' ? 'bg-red-100 text-red-700' :
                            dueState === 'due_today' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {dueLabel(request, today)}
                          </span>
                        )}
                        {request.related_control && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {request.related_control}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{request.request_text}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                        {request.auditor && <span>Auditor: {request.auditor}</span>}
                        {request.owner_name && <span>Owner: {request.owner_name}</span>}
                        <span>Submitted: {request.submitted_date}</span>
                        {request.control_title && <span>{request.control_title}</span>}
                      </div>
                      {request.response && (
                        <p className="mt-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-2">
                          {request.response}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openEdit(request)}>
                        Respond / Update
                      </Button>
                      <div className="flex gap-1">
                        {request.status === 'answered' && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-emerald-700" onClick={() => quickStatus(request, 'accepted')}>
                            Accept
                          </Button>
                        )}
                        {request.status !== 'closed' && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-slate-600" onClick={() => quickStatus(request, 'closed')}>
                            Close
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <RequestDialog
        open={createOpen}
        title="Create Auditor Request"
        form={form}
        controls={controls}
        saving={saving}
        onOpenChange={setCreateOpen}
        onChange={setForm}
        onSave={handleCreate}
      />

      <RequestDialog
        open={editOpen}
        title="Respond / Update Request"
        form={form}
        controls={controls}
        saving={saving}
        onOpenChange={setEditOpen}
        onChange={setForm}
        onSave={() => handleUpdate()}
        onAnswer={() => handleUpdate('answered')}
        onAccept={() => handleUpdate('accepted')}
        onClose={() => handleUpdate('closed')}
        showStatus
      />
    </div>
  );
}

function RequestDialog({
  open,
  title,
  form,
  controls,
  saving,
  showStatus = false,
  onOpenChange,
  onChange,
  onSave,
  onAnswer,
  onAccept,
  onClose,
}: {
  open: boolean;
  title: string;
  form: typeof emptyForm;
  controls: Pick<Control, 'id' | 'title'>[];
  saving: boolean;
  showStatus?: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSave: () => void;
  onAnswer?: () => void;
  onAccept?: () => void;
  onClose?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Auditor</Label>
              <Input
                value={form.auditor}
                onChange={e => onChange(f => ({ ...f, auditor: e.target.value }))}
                placeholder="External auditor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input
                value={form.owner_name}
                onChange={e => onChange(f => ({ ...f, owner_name: e.target.value }))}
                placeholder="Internal owner"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Request *</Label>
            <Textarea
              value={form.request_text}
              onChange={e => onChange(f => ({ ...f, request_text: e.target.value }))}
              placeholder="What did the auditor ask for?"
              className="min-h-24 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Related control</Label>
              <select
                value={form.related_control}
                onChange={e => onChange(f => ({ ...f, related_control: e.target.value }))}
                className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">None</option>
                {controls.map(c => <option key={c.id} value={c.id}>{c.id} - {c.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Submitted</Label>
              <Input
                type="date"
                value={form.submitted_date}
                onChange={e => onChange(f => ({ ...f, submitted_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={e => onChange(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>

          {showStatus && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={e => onChange(f => ({ ...f, status: e.target.value as RequestStatus }))}
                className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {STATUSES.map(status => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Response</Label>
            <Textarea
              value={form.response}
              onChange={e => onChange(f => ({ ...f, response: e.target.value }))}
              placeholder="Summarize the answer or evidence provided."
              className="min-h-28 text-sm"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {showStatus && (
            <>
              <Button variant="outline" onClick={onAnswer} disabled={saving || !form.response.trim()}>
                Answer
              </Button>
              <Button variant="outline" onClick={onAccept} disabled={saving}>
                Accept
              </Button>
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Close
              </Button>
            </>
          )}
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDueState(request: AuditorRequest, today: string): 'none' | 'overdue' | 'due_today' | 'scheduled' {
  if (!request.due_date || request.status !== 'open') return 'none';
  if (request.due_date < today) return 'overdue';
  if (request.due_date === today) return 'due_today';
  return 'scheduled';
}

function dueLabel(request: AuditorRequest, today: string): string {
  if (!request.due_date) return '';
  if (request.due_date < today) return `Overdue ${request.due_date}`;
  if (request.due_date === today) return 'Due today';
  return `Due ${request.due_date}`;
}
