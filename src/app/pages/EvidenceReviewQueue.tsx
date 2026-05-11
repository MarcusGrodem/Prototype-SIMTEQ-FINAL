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
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Download,
  Search,
  Filter,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Document, DocumentLink } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import { toast } from 'sonner';
import { demoControls, demoDocumentLinks, demoDocuments } from '../data/demoFallbacks';

interface DocumentWithLinks extends Document {
  document_links: (DocumentLink & { control_title?: string })[];
}

type Tab = 'pending' | 'approved' | 'rejected';

const TAB_LABELS: Record<Tab, string> = {
  pending:  'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_STYLE: Record<Tab, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export function EvidenceReviewQueue() {
  const [docs, setDocs] = useState<DocumentWithLinks[]>([]);
  const [controls, setControls] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');

  // Reject dialog
  const [rejectDoc, setRejectDoc] = useState<DocumentWithLinks | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [saving, setSaving] = useState(false);

  const { profile } = useAuth();
  const { activePeriod } = useAuditPeriod();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [docRes, ctrlRes] = await Promise.all([
      supabase.from('documents').select('*, document_links(*)').order('created_at', { ascending: false }),
      supabase.from('controls').select('id, title'),
    ]);
    const controlRows = ctrlRes.data && ctrlRes.data.length > 0
      ? ctrlRes.data
      : demoControls.map(({ id, title }) => ({ id, title }));
    const documentRows = docRes.data && docRes.data.length > 0
      ? docRes.data as DocumentWithLinks[]
      : demoDocuments.map(doc => ({
          ...doc,
          document_links: demoDocumentLinks.filter(link => link.document_id === doc.id),
        }));
    setControls(controlRows);
    if (documentRows.length > 0) {
      const ctrlMap = Object.fromEntries(controlRows.map(c => [c.id, c.title]));
      const enriched = documentRows.map(doc => ({
        ...doc,
        document_links: doc.document_links.map(link => ({
          ...link,
          control_title: link.link_type === 'control' ? (ctrlMap[link.link_id] ?? link.link_id) : undefined,
        })),
      }));
      setDocs(enriched);
    }
    setLoading(false);
  };

  const handleDownload = async (doc: DocumentWithLinks) => {
    if (!doc.file_path) { toast.error('No file available'); return; }
    const { data, error } = await supabase.storage.from('evidence').createSignedUrl(doc.file_path, 3600);
    if (error || !data) { toast.error('Could not get download URL'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const handleApprove = async (doc: DocumentWithLinks) => {
    setSaving(true);
    const { error } = await supabase.from('documents').update({
      reviewer_status: 'approved',
      reviewed_by_name: profile?.full_name ?? 'Unknown',
      reviewed_date: new Date().toISOString().split('T')[0],
      reviewer_comment: null,
      updated_at: new Date().toISOString(),
    }).eq('id', doc.id);
    setSaving(false);
    if (error) { toast.error('Failed to approve'); return; }
    toast.success(`"${doc.name}" approved`);
    loadData();
  };

  const handleRejectSubmit = async () => {
    if (!rejectDoc) return;
    setSaving(true);
    const { error } = await supabase.from('documents').update({
      reviewer_status: 'rejected',
      reviewed_by_name: profile?.full_name ?? 'Unknown',
      reviewed_date: new Date().toISOString().split('T')[0],
      reviewer_comment: rejectComment || null,
      updated_at: new Date().toISOString(),
    }).eq('id', rejectDoc.id);
    setSaving(false);
    if (error) { toast.error('Failed to reject'); return; }
    toast.success(`"${rejectDoc.name}" rejected`);
    setRejectDoc(null);
    setRejectComment('');
    loadData();
  };

  const handleResetToPending = async (doc: DocumentWithLinks) => {
    await supabase.from('documents').update({
      reviewer_status: 'pending',
      reviewed_by_name: null,
      reviewed_date: null,
      reviewer_comment: null,
      updated_at: new Date().toISOString(),
    }).eq('id', doc.id);
    toast.success('Reset to pending');
    loadData();
  };

  const filteredDocs = docs
    .filter(d => d.reviewer_status === activeTab)
    .filter(d =>
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.uploaded_by_name.toLowerCase().includes(search.toLowerCase())
    );

  const counts = {
    pending:  docs.filter(d => d.reviewer_status === 'pending').length,
    approved: docs.filter(d => d.reviewer_status === 'approved').length,
    rejected: docs.filter(d => d.reviewer_status === 'rejected').length,
  };

  const evidenceCompletnessRate = (() => {
    const total = docs.filter(d => d.reviewer_status !== 'pending' || true).length;
    if (total === 0) return null;
    const approved = counts.approved;
    const submitted = counts.approved + counts.rejected + counts.pending;
    return submitted > 0 ? Math.round((approved / submitted) * 100) : null;
  })();

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Evidence Review Queue</h1>
            <p className="text-xs text-slate-400 mt-2">
              {activePeriod ? `Active period: ${activePeriod.name}` : 'No active audit period'}
            </p>
          </div>
          {evidenceCompletnessRate !== null && (
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">{evidenceCompletnessRate}%</p>
              <p className="text-xs text-slate-500">Evidence approval rate</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6">

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 border-yellow-200 bg-yellow-50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-xs text-yellow-700">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-800">{counts.pending}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-green-200 bg-green-50">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-green-700">Approved</p>
                <p className="text-2xl font-bold text-green-800">{counts.approved}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-red-700">Rejected</p>
                <p className="text-2xl font-bold text-red-800">{counts.rejected}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs + search */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {TAB_LABELS[tab]}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${STATUS_STYLE[tab]}`}>
                  {counts[tab]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Document list */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading…</div>
        ) : filteredDocs.length === 0 ? (
          <Card className="py-16 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500">No {activeTab} documents</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDocs.map(doc => (
              <Card key={doc.id} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{doc.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Uploaded by {doc.uploaded_by_name} · {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLE[doc.reviewer_status as Tab]}`}>
                        {doc.reviewer_status}
                      </span>
                    </div>

                    {/* Linked controls */}
                    {doc.document_links.filter(l => l.link_type === 'control').length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {doc.document_links.filter(l => l.link_type === 'control').map(link => (
                          <Badge key={link.id} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {link.link_id}{link.control_title ? ` — ${link.control_title}` : ''}
                            {link.execution_id && <span className="ml-1 text-blue-400">· execution</span>}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Reviewer comment */}
                    {doc.reviewer_comment && (
                      <p className="text-xs text-slate-500 mt-2 italic border-l-2 border-slate-200 pl-2">
                        "{doc.reviewer_comment}" — {doc.reviewed_by_name}, {doc.reviewed_date}
                      </p>
                    )}
                    {doc.reviewer_status === 'approved' && doc.reviewed_by_name && (
                      <p className="text-xs text-green-600 mt-2">
                        Approved by {doc.reviewed_by_name} on {doc.reviewed_date}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => handleDownload(doc)}>
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </Button>

                      {doc.reviewer_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
                            disabled={saving}
                            onClick={() => handleApprove(doc)}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => { setRejectDoc(doc); setRejectComment(''); }}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </Button>
                        </>
                      )}

                      {doc.reviewer_status !== 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-slate-500"
                          onClick={() => handleResetToPending(doc)}
                        >
                          Reset to pending
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectDoc} onOpenChange={open => { if (!open) { setRejectDoc(null); setRejectComment(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Evidence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              Rejecting <strong>"{rejectDoc?.name}"</strong>. The owner will need to re-upload corrected evidence.
            </p>
            <div className="space-y-1.5">
              <Label>Reason for rejection (optional)</Label>
              <Input
                placeholder="e.g. Screenshot is too old, needs current export"
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDoc(null); setRejectComment(''); }}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
              onClick={handleRejectSubmit}
            >
              {saving ? 'Rejecting…' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
