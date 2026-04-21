import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { StatusBadge } from './StatusBadge';
import { Button } from './ui/button';
import {
  Calendar,
  User,
  FileText,
  AlertTriangle,
  FileCheck,
  Download,
  Shield,
  Clock,
  CheckCircle2,
  UserCheck,
  Eye,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Control } from '../../lib/types';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { getRiskScoreColor } from '../utils/riskUtils';

interface ControlDetailsDialogProps {
  control: Control | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onGoToControl?: () => void;
}

interface LinkedRisk {
  id: string;
  title: string;
  category: string;
  likelihood: string;
  impact: string;
  risk_score: number;
  owner_name: string;
  status: string;
  last_review: string | null;
}

interface LinkedDoc {
  id: string;
  name: string;
  uploaded_by_name: string;
  current_version: number;
  file_path: string | null;
}

export function ControlDetailsDialog({ control, open, onOpenChange, onSuccess, onGoToControl }: ControlDetailsDialogProps) {
  const [executedBy, setExecutedBy] = useState<string | null>(null);
  const [executedDate, setExecutedDate] = useState<string | null>(null);
  const [reviewedBy, setReviewedBy] = useState<string | null>(null);
  const [reviewedDate, setReviewedDate] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [linkedRisks, setLinkedRisks] = useState<LinkedRisk[]>([]);
  const [linkedDocs, setLinkedDocs] = useState<LinkedDoc[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    if (control && open) {
      loadLinkedData();
      // Reset four-eye state
      setExecutedBy(null);
      setExecutedDate(null);
      setReviewedBy(null);
      setReviewedDate(null);
      setReviewStatus(null);
    }
  }, [control, open]);

  const loadLinkedData = async () => {
    if (!control) return;
    const [rcRes, dlRes] = await Promise.all([
      supabase.from('risk_controls').select('risk_id').eq('control_id', control.id),
      supabase.from('document_links').select('document_id').eq('link_type', 'control').eq('link_id', control.id)
    ]);

    if (rcRes.data && rcRes.data.length > 0) {
      const riskIds = rcRes.data.map(r => r.risk_id);
      const { data: risks } = await supabase.from('risks').select('*').in('id', riskIds);
      setLinkedRisks(risks || []);
    } else {
      setLinkedRisks([]);
    }

    if (dlRes.data && dlRes.data.length > 0) {
      const docIds = dlRes.data.map(d => d.document_id);
      const { data: docs } = await supabase.from('documents').select('id, name, uploaded_by_name, current_version, file_path').in('id', docIds);
      setLinkedDocs(docs || []);
    } else {
      setLinkedDocs([]);
    }
  };

  if (!control) return null;

  const currentUser = profile?.full_name ?? 'Unknown User';

  const handleMarkAsExecuted = () => {
    setExecutedBy(currentUser);
    setExecutedDate(new Date().toLocaleDateString('en-US'));
    setReviewStatus('pending');
  };

  const handleApprove = async () => {
    setReviewedBy(currentUser);
    setReviewedDate(new Date().toLocaleDateString('en-US'));
    setReviewStatus('approved');

    // Update control status to Completed
    const { error } = await supabase
      .from('controls')
      .update({ status: 'Completed', last_execution: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
      .eq('id', control.id);
    if (error) toast.error('Failed to update control status');
    else { toast.success('Control approved and marked as completed!'); onSuccess?.(); }
  };

  const handleReject = () => {
    setReviewedBy(currentUser);
    setReviewedDate(new Date().toLocaleDateString('en-US'));
    setReviewStatus('rejected');
  };

  const handleDownloadDoc = async (doc: LinkedDoc) => {
    if (!doc.file_path) { toast.error('No file path available'); return; }
    const { data, error } = await supabase.storage.from('evidence').createSignedUrl(doc.file_path, 3600);
    if (error || !data) { toast.error('Could not get download URL'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const canExecute = !executedBy;
  const canReview = executedBy && !reviewedBy && executedBy !== currentUser;
  const isFullyApproved = reviewStatus === 'approved';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <DialogTitle>{control.title}</DialogTitle>
                <Badge variant="outline" className="text-xs">{control.id}</Badge>
              </div>
              <DialogDescription className="text-sm text-gray-500">
                {control.description ?? 'No description'}
              </DialogDescription>
            </div>
            <StatusBadge status={control.status} />
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Control Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Category</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{control.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Frequency</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{control.frequency}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Control Owner</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{control.owner_name}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Execution</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{control.last_execution ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  control.status === 'Overdue' ? 'bg-red-100' :
                  control.status === 'Pending' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  <Calendar className={`w-5 h-5 ${
                    control.status === 'Overdue' ? 'text-red-600' :
                    control.status === 'Pending' ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Next Due Date</p>
                  <p className={`text-sm font-medium mt-1 ${control.status === 'Overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                    {control.next_due ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  linkedDocs.length > 0 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <FileCheck className={`w-5 h-5 ${linkedDocs.length > 0 ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Evidence Documents</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {linkedDocs.length > 0 ? `${linkedDocs.length} document(s)` : 'No evidence uploaded'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Files */}
          {linkedDocs.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Evidence Files</h3>
              <div className="space-y-2">
                {linkedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-900">{doc.name}</span>
                        <span className="text-xs text-gray-500 ml-2">v{doc.current_version} • {doc.uploaded_by_name}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadDoc(doc)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Four-Eye Principle */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Four-Eye Principle</h3>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Dual Control Required
              </Badge>
            </div>

            {!executedBy && !reviewedBy && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Dual Control Not Started</p>
                    <p className="text-xs text-gray-600 mt-1">
                      This control requires execution by one person and independent review by another before completion.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(executedBy || reviewedBy) && (
              <div className="space-y-4">
                <div className={`p-4 border rounded-lg ${executedBy ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${executedBy ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {executedBy ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <User className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Step 1: Execution</p>
                      {executedBy ? (
                        <div className="space-y-1 mt-1">
                          <p className="text-sm text-gray-700">Executed by <span className="font-medium">{executedBy}</span></p>
                          <p className="text-xs text-gray-500">Date: {executedDate}</p>
                        </div>
                      ) : <p className="text-xs text-gray-500 mt-1">Waiting for execution</p>}
                    </div>
                  </div>
                </div>

                {executedBy && <div className="flex justify-center"><div className="w-px h-8 bg-gray-300"></div></div>}

                <div className={`p-4 border rounded-lg ${
                  reviewStatus === 'approved' ? 'bg-green-50 border-green-200' :
                  reviewStatus === 'rejected' ? 'bg-red-50 border-red-200' :
                  reviewStatus === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      reviewStatus === 'approved' ? 'bg-green-100' :
                      reviewStatus === 'rejected' ? 'bg-red-100' :
                      reviewStatus === 'pending' ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}>
                      {reviewStatus === 'approved' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                       reviewStatus === 'rejected' ? <AlertCircle className="w-5 h-5 text-red-600" /> :
                       <UserCheck className={`w-5 h-5 ${reviewStatus === 'pending' ? 'text-yellow-600' : 'text-gray-400'}`} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Step 2: Independent Review</p>
                      {reviewedBy ? (
                        <div className="space-y-1 mt-1">
                          <p className="text-sm text-gray-700">Reviewed by <span className="font-medium">{reviewedBy}</span></p>
                          <p className="text-xs text-gray-500">Date: {reviewedDate}</p>
                        </div>
                      ) : reviewStatus === 'pending' ? (
                        <div className="mt-1">
                          <p className="text-xs text-gray-500">Awaiting independent review</p>
                          {executedBy === currentUser && (
                            <p className="text-xs text-orange-600 font-medium mt-1">You cannot review your own execution</p>
                          )}
                        </div>
                      ) : <p className="text-xs text-gray-500 mt-1">Waiting for execution</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Linked Risks */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm font-semibold text-gray-900">Linked Risks ({linkedRisks.length})</h3>
            </div>

            {linkedRisks.length > 0 ? (
              <div className="space-y-3">
                {linkedRisks.map((risk) => (
                  <div key={risk.id} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-gray-900">{risk.id}</span>
                          <Badge variant="outline" className="text-xs">{risk.category}</Badge>
                          <Badge variant="outline" className={`text-xs font-semibold border ${getRiskScoreColor(risk.risk_score)}`}>
                            Risk Score: {risk.risk_score}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-900">{risk.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                          <span>Owner: {risk.owner_name}</span>
                          <span>•</span>
                          <StatusBadge status={risk.status as 'Active' | 'Mitigated' | 'Monitoring'} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">No risks linked to this control</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-6 flex flex-wrap justify-end gap-2">
            {onGoToControl && (
              <Button variant="outline" size="sm" onClick={onGoToControl} className="mr-auto">
                <ExternalLink className="w-4 h-4 mr-1" />
                Go to Control
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={!canExecute} onClick={handleMarkAsExecuted}>
              Mark as Executed
            </Button>
            {canReview && (
              <>
                <Button size="sm" onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button size="sm" variant="outline" onClick={handleReject} className="text-red-600 border-red-200 hover:bg-red-50">
                  Reject
                </Button>
              </>
            )}
            {isFullyApproved && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-900">Approved by {reviewedBy}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
