import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import {
  Search,
  Upload,
  Download,
  FileText,
  Link as LinkIcon,
  MoreVertical,
  FileCheck,
  History,
  Trash2,
  Edit2
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Document, DocumentVersion, DocumentLink, Control, Risk } from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { showUndoDeleteToast, showUploadFailureToast, UNDO_TOAST_DURATION_MS } from '../utils/toastActions';

interface DocumentWithLinks extends Document {
  document_links: DocumentLink[];
}

export function Evidence() {
  const [documents, setDocuments] = useState<DocumentWithLinks[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [uploading, setUploading] = useState(false);

  // History modal
  const [historyDoc, setHistoryDoc] = useState<DocumentWithLinks | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [changelog, setChangelog] = useState('');

  // Link modal
  const [linkDoc, setLinkDoc] = useState<DocumentWithLinks | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkType, setLinkType] = useState<'control' | 'risk' | ''>('');
  const [linkId, setLinkId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [docRes, ctrlRes, riskRes] = await Promise.all([
      supabase.from('documents').select('*, document_links(*)').order('created_at', { ascending: false }),
      supabase.from('controls').select('id, title').order('id'),
      supabase.from('risks').select('id, title').order('id')
    ]);
    if (docRes.data) setDocuments(docRes.data as DocumentWithLinks[]);
    if (ctrlRes.data) setControls(ctrlRes.data as Control[]);
    if (riskRes.data) setRisks(riskRes.data as Risk[]);
    setLoading(false);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.uploaded_by_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setPendingFile(file); setDocName(file.name.replace(/\.[^/.]+$/, '')); setUploadModalOpen(true); }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPendingFile(file); setDocName(file.name.replace(/\.[^/.]+$/, '')); setUploadModalOpen(true); }
  };

  const handleUpload = async () => {
    if (!pendingFile || !docName) { toast.error('Name is required'); return; }
    setUploading(true);

    const docId = crypto.randomUUID();
    const path = `documents/${docId}/${pendingFile.name}`;

    const { error: uploadError } = await supabase.storage.from('evidence').upload(path, pendingFile);
    if (uploadError) {
      setUploading(false);
      showUploadFailureToast('Upload failed: ' + uploadError.message, handleUpload);
      return;
    }

    const { error: insertError } = await supabase.from('documents').insert({
      id: docId,
      name: docName,
      file_type: pendingFile.type,
      uploaded_by_name: profile?.full_name ?? 'Unknown',
      file_path: path,
      file_size: pendingFile.size,
      current_version: 1
    });

    if (insertError) { toast.error('Failed to save document'); setUploading(false); return; }

    await supabase.from('document_versions').insert({
      document_id: docId,
      version: 1,
      file_path: path,
      file_size: pendingFile.size,
      changelog: 'Initial upload',
      uploaded_by_name: profile?.full_name ?? 'Unknown'
    });

    toast.success('Document uploaded successfully!');
    setPendingFile(null);
    setDocName('');
    setUploading(false);
    setUploadModalOpen(false);
    loadData();
  };

  const handleDownload = async (doc: DocumentWithLinks) => {
    if (!doc.file_path) { toast.error('No file available'); return; }
    const { data, error } = await supabase.storage.from('evidence').createSignedUrl(doc.file_path, 3600);
    if (error || !data) { toast.error('Could not get download URL'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async (doc: DocumentWithLinks) => {
    if (!confirm(`Delete "${doc.name}"? You can undo for 5 seconds.`)) return;

    const [versionsRes, linksRes] = await Promise.all([
      supabase.from('document_versions').select('*').eq('document_id', doc.id),
      supabase.from('document_links').select('*').eq('document_id', doc.id)
    ]);
    const versionRows = versionsRes.data || [];
    const linkRows = linksRes.data || doc.document_links || [];
    const { document_links: _documentLinks, ...documentRecord } = doc;

    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) { toast.error('Failed to delete document'); return; }

    setDocuments(prev => prev.filter(item => item.id !== doc.id));

    const storagePaths = Array.from(new Set(
      [doc.file_path, ...versionRows.map(version => version.file_path)].filter(Boolean) as string[]
    ));
    let undoRequested = false;
    const cleanupTimer = window.setTimeout(() => {
      if (!undoRequested && storagePaths.length > 0) {
        void supabase.storage.from('evidence').remove(storagePaths);
      }
    }, UNDO_TOAST_DURATION_MS);

    showUndoDeleteToast('Document deleted', async () => {
      undoRequested = true;
      window.clearTimeout(cleanupTimer);

      const { error: restoreError } = await supabase.from('documents').upsert(documentRecord);
      if (restoreError) { toast.error('Could not restore document'); return; }

      if (versionRows.length > 0) {
        const { error: versionError } = await supabase.from('document_versions').upsert(versionRows);
        if (versionError) { toast.error('Document restored without version history'); }
      }

      if (linkRows.length > 0) {
        const { error: linkError } = await supabase.from('document_links').upsert(linkRows);
        if (linkError) { toast.error('Document restored without links'); }
      }

      toast.success('Document restored');
      loadData();
    });
  };

  const handleRename = async (doc: DocumentWithLinks) => {
    const newName = prompt('Enter new name:', doc.name);
    if (!newName || newName === doc.name) return;
    await supabase.from('documents').update({ name: newName, updated_at: new Date().toISOString() }).eq('id', doc.id);
    toast.success('Document renamed');
    loadData();
  };

  const openHistory = async (doc: DocumentWithLinks) => {
    setHistoryDoc(doc);
    const { data } = await supabase.from('document_versions').select('*').eq('document_id', doc.id).order('version', { ascending: false });
    setVersions(data || []);
    setHistoryOpen(true);
    setReuploadFile(null);
    setChangelog('');
  };

  const handleReupload = async () => {
    if (!reuploadFile || !changelog || !historyDoc) { toast.error('File and changelog are required'); return; }
    setUploading(true);
    const newVersion = historyDoc.current_version + 1;
    const path = `documents/${historyDoc.id}/v${newVersion}-${reuploadFile.name}`;

    const { error: uploadError } = await supabase.storage.from('evidence').upload(path, reuploadFile);
    if (uploadError) {
      setUploading(false);
      showUploadFailureToast('Upload failed: ' + uploadError.message, handleReupload);
      return;
    }

    await supabase.from('document_versions').insert({
      document_id: historyDoc.id,
      version: newVersion,
      file_path: path,
      file_size: reuploadFile.size,
      changelog,
      uploaded_by_name: profile?.full_name ?? 'Unknown'
    });

    await supabase.from('documents').update({
      current_version: newVersion,
      file_path: path,
      file_size: reuploadFile.size,
      updated_at: new Date().toISOString()
    }).eq('id', historyDoc.id);

    toast.success(`Version ${newVersion} uploaded`);
    setReuploadFile(null);
    setChangelog('');
    setUploading(false);
    openHistory({ ...historyDoc, current_version: newVersion, file_path: path });
    loadData();
  };

  const handleLink = async () => {
    if (!linkDoc || !linkType || !linkId) { toast.error('Please select type and ID'); return; }
    const { error } = await supabase.from('document_links').insert({
      document_id: linkDoc.id,
      link_type: linkType,
      link_id: linkId
    });
    if (error) { toast.error('Link failed (may already exist)'); return; }
    toast.success('Document linked successfully');
    setLinkOpen(false);
    loadData();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Evidence & Documentation</h1>
            <p className="text-xs text-slate-400 mt-2">Manage compliance documentation and evidence</p>
          </div>
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        </div>
      </div>
      <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total Documents</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{documents.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Linked to Controls</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {documents.filter(d => d.document_links.some(l => l.link_type === 'control')).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Linked to Risks</p>
          <p className="text-2xl font-semibold text-orange-600 mt-1">
            {documents.filter(d => d.document_links.some(l => l.link_type === 'risk')).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total Storage</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            {formatSize(documents.reduce((acc, d) => acc + (d.file_size ?? 0), 0))}
          </p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Upload Area */}
      <Card
        className={`p-8 border-2 border-dashed transition-colors ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="mt-4 font-medium text-slate-900">Upload evidence documents</h3>
          <p className="text-sm text-slate-500 mt-1">Drag and drop files here, or click to browse</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fileInputRef.current?.click()}>
            Select Files
          </Button>
        </div>
      </Card>

      {/* Documents Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 truncate">{doc.name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-slate-500">Uploaded by {doc.uploaded_by_name}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">{formatSize(doc.file_size)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="outline" className="text-xs">v{doc.current_version}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(doc)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRename(doc)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Linked Items */}
                  {doc.document_links.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                      <div className="flex flex-wrap gap-2">
                        {doc.document_links.map((link) => (
                          <Badge
                            key={link.id}
                            variant="outline"
                            className={`text-xs ${
                              link.link_type === 'control'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}
                          >
                            {link.link_type === 'control' ? 'Control' : 'Risk'}: {link.link_id}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                      <Download className="w-3.5 h-3.5 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setLinkDoc(doc); setLinkType(''); setLinkId(''); setLinkOpen(true); }}>
                      <LinkIcon className="w-3.5 h-3.5 mr-2" />
                      Link to Control/Risk
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openHistory(doc)}>
                      <History className="w-3.5 h-3.5 mr-2" />
                      View History
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredDocuments.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No documents found. Upload your first evidence document above.</p>
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Set a name for the document before uploading.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {pendingFile && (
              <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">{pendingFile.name}</p>
                  <p className="text-xs text-slate-500">{formatSize(pendingFile.size)}</p>
                </div>
              </div>
            )}
            <div>
              <Label>Document Name *</Label>
              <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Document name" className="mt-1.5" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setUploadModalOpen(false); setPendingFile(null); setDocName(''); }}>Cancel</Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>{historyDoc?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {versions.map(v => (
              <div key={v.id} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">v{v.version}</span>
                      <span className="text-sm font-medium text-slate-900">{v.changelog}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">By {v.uploaded_by_name} • {new Date(v.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{formatSize(v.file_size)}</Badge>
                </div>
              </div>
            ))}

            {/* Upload new version */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Upload New Version</h4>
              <div className="space-y-3">
                <div>
                  <Label>Changelog / What changed *</Label>
                  <Input value={changelog} onChange={e => setChangelog(e.target.value)} placeholder="Describe what changed in this version" className="mt-1.5" />
                </div>
                <div>
                  <Label>New File *</Label>
                  <input
                    type="file"
                    className="mt-1.5 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-700"
                    onChange={e => setReuploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button onClick={handleReupload} disabled={uploading || !reuploadFile || !changelog} className="w-full">
                  {uploading ? 'Uploading...' : 'Upload New Version'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Modal */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Document</DialogTitle>
            <DialogDescription>Link "{linkDoc?.name}" to a control or risk.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Link Type</Label>
              <select value={linkType} onChange={e => { setLinkType(e.target.value as 'control' | 'risk' | ''); setLinkId(''); }} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select type...</option>
                <option value="control">Control</option>
                <option value="risk">Risk</option>
              </select>
            </div>
            {linkType === 'control' && (
              <div>
                <Label>Select Control</Label>
                <select value={linkId} onChange={e => setLinkId(e.target.value)} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a control...</option>
                  {controls.map(c => <option key={c.id} value={c.id}>{c.id} — {c.title}</option>)}
                </select>
              </div>
            )}
            {linkType === 'risk' && (
              <div>
                <Label>Select Risk</Label>
                <select value={linkId} onChange={e => setLinkId(e.target.value)} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a risk...</option>
                  {risks.map(r => <option key={r.id} value={r.id}>{r.id} — {r.title}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
              <Button onClick={handleLink} disabled={!linkType || !linkId}>Link Document</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tips */}
      <Card className="p-5 bg-slate-50">
        <h3 className="text-sm font-medium text-slate-900 mb-3">Document Management Tips</h3>
        <ul className="text-sm text-slate-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Link documents to relevant controls and risks for complete audit trails</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Use "View History" to track changes and upload new versions with changelogs</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>All evidence is encrypted and stored securely in Supabase Storage</span>
          </li>
        </ul>
      </Card>
      </div>
    </div>
  );
}
