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
  AlertCircle
} from 'lucide-react';
import { Control, risks } from '../data/mockData';
import { useState } from 'react';

interface ControlDetailsDialogProps {
  control: Control | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ControlDetailsDialog({ control, open, onOpenChange }: ControlDetailsDialogProps) {
  // Four-eye principle state
  const [executedBy, setExecutedBy] = useState<string | null>(null);
  const [executedDate, setExecutedDate] = useState<string | null>(null);
  const [reviewedBy, setReviewedBy] = useState<string | null>(null);
  const [reviewedDate, setReviewedDate] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);

  if (!control) return null;

  // Simulate current user
  const currentUser = 'Anna Johansen';

  // Get risks linked to this control
  const linkedRisks = risks.filter(risk => 
    risk.relatedControls.includes(control.id)
  );

  const getRiskScoreColor = (score: number) => {
    if (score >= 7) return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 4) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const handleMarkAsExecuted = () => {
    setExecutedBy(currentUser);
    setExecutedDate(new Date().toLocaleDateString('en-US'));
    setReviewStatus('pending');
  };

  const handleApprove = () => {
    setReviewedBy(currentUser);
    setReviewedDate(new Date().toLocaleDateString('en-US'));
    setReviewStatus('approved');
  };

  const handleReject = () => {
    setReviewedBy(currentUser);
    setReviewedDate(new Date().toLocaleDateString('en-US'));
    setReviewStatus('rejected');
  };

  const canExecute = !executedBy;
  const canReview = executedBy && !reviewedBy && executedBy !== currentUser;
  const isFullyApproved = reviewStatus === 'approved';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <DialogTitle>{control.title}</DialogTitle>
                <Badge variant="outline" className="text-xs">
                  {control.id}
                </Badge>
              </div>
              <DialogDescription className="text-sm text-gray-500">
                {control.description}
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
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {control.owner.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{control.owner}</p>
                  </div>
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
                  <p className="text-sm font-medium text-gray-900 mt-1">{control.lastExecution}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  control.status === 'Overdue' 
                    ? 'bg-red-100' 
                    : control.status === 'Pending'
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
                }`}>
                  <Calendar className={`w-5 h-5 ${
                    control.status === 'Overdue' 
                      ? 'text-red-600' 
                      : control.status === 'Pending'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Next Due Date</p>
                  <p className={`text-sm font-medium mt-1 ${
                    control.status === 'Overdue' ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {control.nextDue}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  control.evidence.length > 0 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <FileCheck className={`w-5 h-5 ${
                    control.evidence.length > 0 ? 'text-green-600' : 'text-yellow-600'
                  }`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Evidence Documents</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {control.evidence.length > 0 
                      ? `${control.evidence.length} ${control.evidence.length === 1 ? 'document' : 'documents'}`
                      : 'No evidence uploaded'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Files */}
          {control.evidence.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Evidence Files</h3>
              <div className="space-y-2">
                {control.evidence.map((fileName, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{fileName}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Four-Eye Principle Section */}
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
                      This control requires execution by one person and independent review by another person before completion.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(executedBy || reviewedBy) && (
              <div className="space-y-4">
                {/* Execution Step */}
                <div className={`p-4 border rounded-lg ${
                  executedBy ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      executedBy ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {executedBy ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">Step 1: Execution</p>
                        {executedBy && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                            Completed
                          </Badge>
                        )}
                      </div>
                      {executedBy ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700">
                            Executed by <span className="font-medium">{executedBy}</span>
                          </p>
                          <p className="text-xs text-gray-500">Date: {executedDate}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Waiting for execution</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                {executedBy && (
                  <div className="flex justify-center">
                    <div className="w-px h-8 bg-gray-300"></div>
                  </div>
                )}

                {/* Review Step */}
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
                      reviewStatus === 'pending' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      {reviewStatus === 'approved' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : reviewStatus === 'rejected' ? (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      ) : (
                        <UserCheck className={`w-5 h-5 ${reviewStatus === 'pending' ? 'text-yellow-600' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900">Step 2: Independent Review</p>
                        {reviewStatus === 'approved' && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                            Approved
                          </Badge>
                        )}
                        {reviewStatus === 'rejected' && (
                          <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                            Rejected
                          </Badge>
                        )}
                        {reviewStatus === 'pending' && (
                          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                            Pending Review
                          </Badge>
                        )}
                      </div>
                      {reviewedBy ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-700">
                            Reviewed by <span className="font-medium">{reviewedBy}</span>
                          </p>
                          <p className="text-xs text-gray-500">Date: {reviewedDate}</p>
                        </div>
                      ) : reviewStatus === 'pending' ? (
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Awaiting independent review (reviewer must be different from executor)</p>
                          {executedBy === currentUser && (
                            <p className="text-xs text-orange-600 font-medium">
                              ⚠️ You cannot review your own execution
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Waiting for execution to complete</p>
                      )}
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
              <h3 className="text-sm font-semibold text-gray-900">
                Linked Risks ({linkedRisks.length})
              </h3>
            </div>

            {linkedRisks.length > 0 ? (
              <div className="space-y-3">
                {linkedRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium text-gray-900">{risk.id}</span>
                          <Badge variant="outline" className="text-xs">
                            {risk.category}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-semibold border ${getRiskScoreColor(risk.riskScore)}`}
                          >
                            Risk Score: {risk.riskScore}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">{risk.title}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Likelihood:</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                risk.likelihood === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                                risk.likelihood === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-green-50 text-green-700 border-green-200'
                              }`}
                            >
                              {risk.likelihood}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Impact:</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                risk.impact === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                                risk.impact === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-green-50 text-green-700 border-green-200'
                              }`}
                            >
                              {risk.impact}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                          <span>Owner: {risk.owner}</span>
                          <span>•</span>
                          <span>Last Review: {risk.lastReview}</span>
                          <span>•</span>
                          <StatusBadge status={risk.status} />
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
          <div className="border-t pt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Upload Evidence
            </Button>
            <Button variant="outline" size="sm">
              Edit Control
            </Button>
            <Button size="sm" disabled={!canExecute} onClick={handleMarkAsExecuted}>
              Mark as Executed
            </Button>
            {canReview && (
              <>
                <Button size="sm" onClick={handleApprove}>
                  Approve
                </Button>
                <Button size="sm" onClick={handleReject}>
                  Reject
                </Button>
              </>
            )}
            {isFullyApproved && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm text-gray-900">Approved by {reviewedBy} on {reviewedDate}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}