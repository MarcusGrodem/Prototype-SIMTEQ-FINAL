import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Risk, Control } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { RiskLevel, calculateRiskScore, getRiskScoreColor } from '../utils/riskUtils';
import { Search, X, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { ControlDetailsDialog } from './ControlDetailsDialog';

interface EditRiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk: Risk | null;
  onSuccess?: () => void;
}

export function EditRiskDialog({ open, onOpenChange, risk, onSuccess }: EditRiskDialogProps) {
  const [likelihood, setLikelihood] = useState<RiskLevel>('Low');
  const [impact, setImpact] = useState<RiskLevel>('Low');
  const [saving, setSaving] = useState(false);
  const [linkedControlIds, setLinkedControlIds] = useState<string[]>([]);
  const [allControls, setAllControls] = useState<Pick<Control, 'id' | 'title' | 'category'>[]>([]);
  const [controlSearch, setControlSearch] = useState('');
  const [showControlPicker, setShowControlPicker] = useState(false);
  const [controlDetailsOpen, setControlDetailsOpen] = useState(false);
  const [selectedLinkedControl, setSelectedLinkedControl] = useState<Control | null>(null);
  const { profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (risk && open) {
      setLikelihood(risk.likelihood);
      setImpact(risk.impact);
      loadLinkedControls();
      loadAllControls();
    }
  }, [risk, open]);

  const loadLinkedControls = async () => {
    if (!risk) return;
    const { data } = await supabase
      .from('risk_controls')
      .select('control_id')
      .eq('risk_id', risk.id);
    setLinkedControlIds((data || []).map(r => r.control_id));
  };

  const loadAllControls = async () => {
    const { data } = await supabase
      .from('controls')
      .select('id, title, category')
      .order('id');
    setAllControls(data || []);
  };

  const riskScore = calculateRiskScore(likelihood, impact);

  const handleMatrixClick = useCallback((l: RiskLevel, i: RiskLevel) => {
    setLikelihood(l);
    setImpact(i);
  }, []);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleLinkControl = async (controlId: string) => {
    if (!risk || linkedControlIds.includes(controlId)) return;
    const { error } = await supabase
      .from('risk_controls')
      .insert({ risk_id: risk.id, control_id: controlId });
    if (error) { toast.error('Failed to link control'); return; }
    setLinkedControlIds(prev => [...prev, controlId]);
    setShowControlPicker(false);
    setControlSearch('');
  };

  const handleUnlinkControl = async (controlId: string) => {
    if (!risk) return;
    const { error } = await supabase
      .from('risk_controls')
      .delete()
      .eq('risk_id', risk.id)
      .eq('control_id', controlId);
    if (error) { toast.error('Failed to unlink control'); return; }
    setLinkedControlIds(prev => prev.filter(id => id !== controlId));
  };

  const handleOpenControlDetails = async (controlId: string) => {
    const { data } = await supabase.from('controls').select('*').eq('id', controlId).single();
    if (data) {
      setSelectedLinkedControl(data);
      setControlDetailsOpen(true);
    }
  };

  const handleGoToControl = () => {
    onOpenChange(false);
    setControlDetailsOpen(false);
    navigate(profile?.role === 'qa' ? '/qa/controls' : '/controls');
  };

  const handleSave = async () => {
    if (!risk) return;
    setSaving(true);
    const { error } = await supabase
      .from('risks')
      .update({ likelihood, impact, risk_score: riskScore, updated_at: new Date().toISOString() })
      .eq('id', risk.id);

    if (error) {
      toast.error('Failed to update risk');
      setSaving(false);
      return;
    }

    toast.success('Risk updated successfully!', { description: `${risk.title} has been updated.` });
    setSaving(false);
    onOpenChange(false);
    onSuccess?.();
  };

  if (!risk) return null;

  const linkedControls = allControls.filter(c => linkedControlIds.includes(c.id));
  const availableControls = allControls.filter(c =>
    !linkedControlIds.includes(c.id) &&
    (c.id.toLowerCase().includes(controlSearch.toLowerCase()) ||
     c.title.toLowerCase().includes(controlSearch.toLowerCase()))
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Risk Assessment</DialogTitle>
          <DialogDescription>
            Adjust the likelihood, impact, and linked controls.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Risk Details */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{risk.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">{risk.id}</Badge>
                  <Badge variant="outline" className="text-xs">{risk.category}</Badge>
                </div>
              </div>
              <Badge variant="outline" className={`text-xs font-semibold border ${getRiskScoreColor(riskScore)}`}>
                Score: {riskScore}
              </Badge>
            </div>
          </div>

          {/* Risk Matrix */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 mb-3">Risk Matrix</h3>
            <p className="text-xs text-slate-500 mb-4">Click on a cell to set the likelihood and impact</p>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs text-center">
                <div></div>
                <div className="font-medium text-slate-600">Low Impact</div>
                <div className="font-medium text-slate-600">Medium Impact</div>
                <div className="font-medium text-slate-600">High Impact</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-xs font-medium text-slate-600 flex items-center">High Likelihood</div>
                <button type="button" onClick={() => handleMatrixClick('High', 'Low')} className={`h-14 rounded flex items-center justify-center text-sm font-semibold transition-all ${likelihood === 'High' && impact === 'Low' ? 'bg-yellow-300 ring-2 ring-yellow-600' : 'bg-yellow-200 hover:bg-yellow-300'}`}>3</button>
                <button type="button" onClick={() => handleMatrixClick('High', 'Medium')} className={`h-14 rounded flex items-center justify-center text-sm font-semibold transition-all ${likelihood === 'High' && impact === 'Medium' ? 'bg-orange-400 ring-2 ring-orange-600' : 'bg-orange-300 hover:bg-orange-400'}`}>7</button>
                <button type="button" onClick={() => handleMatrixClick('High', 'High')} className={`h-14 rounded flex items-center justify-center text-sm font-semibold text-white transition-all ${likelihood === 'High' && impact === 'High' ? 'bg-red-500 ring-2 ring-red-700' : 'bg-red-400 hover:bg-red-500'}`}>9</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-xs font-medium text-slate-600 flex items-center">Medium Likelihood</div>
                <button type="button" onClick={() => handleMatrixClick('Medium', 'Low')} className={`h-14 rounded flex items-center justify-center text-sm font-semibold transition-all ${likelihood === 'Medium' && impact === 'Low' ? 'bg-green-300 ring-2 ring-green-600' : 'bg-green-200 hover:bg-green-300'}`}>2</button>
                <button type="button" onClick={() => handleMatrixClick('Medium', 'Medium')} className={`h-14 rounded flex items-center justify-center text-sm font-semibold transition-all ${likelihood === 'Medium' && impact === 'Medium' ? 'bg-yellow-400 ring-2 ring-yellow-600' : 'bg-yellow-300 hover:bg-yellow-400'}`}>5</button>
                <button type="button" onClick={() => handleMatrixClick('Medium', 'High')} className={`h-14 rounded flex items-center justify-center text-sm font-semibold transition-all ${likelihood === 'Medium' && impact === 'High' ? 'bg-orange-500 ring-2 ring-orange-700' : 'bg-orange-400 hover:bg-orange-500'}`}>7</button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-xs font-medium text-slate-600 flex items-center">Low Likelihood</div>
                <button type="button" onClick={() => handleMatrixClick('Low', 'Low')} className={`h-14 rounded flex items-center justify-center text-sm font-semibold transition-all ${likelihood === 'Low' && impact === 'Low' ? 'bg-green-400 ring-2 ring-green-600' : 'bg-green-300 hover:bg-green-400'}`}>1</button>
                <button type="button" onClick={() => handleMatrixClick('Low', 'Medium')} className={`h-14 rounded flex items-center justify-center text-sm font-semibold transition-all ${likelihood === 'Low' && impact === 'Medium' ? 'bg-green-300 ring-2 ring-green-600' : 'bg-green-200 hover:bg-green-300'}`}>2</button>
                <button type="button" onClick={() => handleMatrixClick('Low', 'High')} className={`h-14 rounded flex items-center justify-center text-sm font-semibold transition-all ${likelihood === 'Low' && impact === 'High' ? 'bg-yellow-400 ring-2 ring-yellow-600' : 'bg-yellow-300 hover:bg-yellow-400'}`}>5</button>
              </div>
            </div>
          </div>

          {/* Current score */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Current Selection</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className="bg-blue-600">Likelihood: {likelihood}</Badge>
                  <Badge className="bg-blue-600">Impact: {impact}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600 mb-1">Risk Score</p>
                <p className="text-2xl font-bold text-blue-900">{riskScore}</p>
              </div>
            </div>
          </div>

          {/* Linked Controls */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-900">Linked Controls</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowControlPicker(prev => !prev)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Link Control
              </Button>
            </div>

            {/* Control picker */}
            {showControlPicker && (
              <div className="mb-3 border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-2 border-b bg-slate-50">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      placeholder="Search controls..."
                      value={controlSearch}
                      onChange={e => setControlSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {availableControls.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No controls available</p>
                  ) : (
                    availableControls.slice(0, 20).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleLinkControl(c.id)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-blue-600 shrink-0">{c.id}</span>
                          <span className="text-xs text-slate-700 truncate">{c.title}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Linked list */}
            {linkedControls.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No controls linked yet.</p>
            ) : (
              <div className="space-y-2">
                {linkedControls.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    onClick={() => handleOpenControlDetails(c.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-blue-600 shrink-0">{c.id}</span>
                      <span className="text-xs text-slate-700 truncate">{c.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleUnlinkControl(c.id); }}
                      className="ml-2 shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ControlDetailsDialog
      control={selectedLinkedControl}
      open={controlDetailsOpen}
      onOpenChange={setControlDetailsOpen}
      onGoToControl={handleGoToControl}
    />
    </>
  );
}
