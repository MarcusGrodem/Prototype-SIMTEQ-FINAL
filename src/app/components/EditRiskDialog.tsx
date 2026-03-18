import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Risk } from '../data/mockData';

interface EditRiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  risk: Risk | null;
}

type RiskLevel = 'Low' | 'Medium' | 'High';

export function EditRiskDialog({ open, onOpenChange, risk }: EditRiskDialogProps) {
  const [likelihood, setLikelihood] = useState<RiskLevel>(risk?.likelihood || 'Low');
  const [impact, setImpact] = useState<RiskLevel>(risk?.impact || 'Low');

  // Handle risk matrix cell click
  const handleMatrixClick = useCallback((l: RiskLevel, i: RiskLevel) => {
    setLikelihood(l);
    setImpact(i);
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Calculate risk score
  const calculateRiskScore = (l: RiskLevel, i: RiskLevel): number => {
    const values = { Low: 1, Medium: 2, High: 3 };
    const score = values[l] * values[i];
    
    if (score >= 7) return 9;
    if (score >= 5) return 7;
    if (score >= 3) return 5;
    return score;
  };

  const riskScore = calculateRiskScore(likelihood, impact);

  const getRiskScoreColor = (score: number) => {
    if (score >= 7) return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 4) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const handleSave = () => {
    toast.success('Risk updated successfully!', {
      description: `${risk?.title} has been updated with new risk levels.`
    });
    onOpenChange(false);
  };

  if (!risk) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Risk Assessment</DialogTitle>
          <DialogDescription>
            Adjust the likelihood and impact to update the risk score.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Risk Details */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{risk.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {risk.id}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {risk.category}
                  </Badge>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={`text-xs font-semibold border ${getRiskScoreColor(riskScore)}`}
              >
                Score: {riskScore}
              </Badge>
            </div>
          </div>

          {/* Risk Matrix */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Risk Matrix</h3>
            <p className="text-xs text-gray-500 mb-4">Click on a cell to set the likelihood and impact</p>
            
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs text-center">
                <div></div>
                <div className="font-medium text-gray-600">Low Impact</div>
                <div className="font-medium text-gray-600">Medium Impact</div>
                <div className="font-medium text-gray-600">High Impact</div>
              </div>
              
              {/* High Likelihood */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-xs font-medium text-gray-600 flex items-center">High Likelihood</div>
                <button
                  type="button"
                  onClick={handleMatrixClick.bind(null, 'High', 'Low')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'High' && impact === 'Low'
                      ? 'bg-yellow-300 ring-2 ring-yellow-600'
                      : 'bg-yellow-200 hover:bg-yellow-300'
                  }`}
                >
                  3
                </button>
                <button
                  type="button"
                  onClick={handleMatrixClick.bind(null, 'High', 'Medium')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'High' && impact === 'Medium'
                      ? 'bg-orange-400 ring-2 ring-orange-600'
                      : 'bg-orange-300 hover:bg-orange-400'
                  }`}
                >
                  7
                </button>
                <button
                  type="button"
                  onClick={handleMatrixClick.bind(null, 'High', 'High')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold text-white transition-all ${
                    likelihood === 'High' && impact === 'High'
                      ? 'bg-red-500 ring-2 ring-red-700'
                      : 'bg-red-400 hover:bg-red-500'
                  }`}
                >
                  9
                </button>
              </div>

              {/* Medium Likelihood */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-xs font-medium text-gray-600 flex items-center">Medium Likelihood</div>
                <button
                  type="button"
                  onClick={handleMatrixClick.bind(null, 'Medium', 'Low')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Medium' && impact === 'Low'
                      ? 'bg-green-300 ring-2 ring-green-600'
                      : 'bg-green-200 hover:bg-green-300'
                  }`}
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={handleMatrixClick.bind(null, 'Medium', 'Medium')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Medium' && impact === 'Medium'
                      ? 'bg-yellow-400 ring-2 ring-yellow-600'
                      : 'bg-yellow-300 hover:bg-yellow-400'
                  }`}
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={handleMatrixClick.bind(null, 'Medium', 'High')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Medium' && impact === 'High'
                      ? 'bg-orange-500 ring-2 ring-orange-700'
                      : 'bg-orange-400 hover:bg-orange-500'
                  }`}
                >
                  7
                </button>
              </div>

              {/* Low Likelihood */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-xs font-medium text-gray-600 flex items-center">Low Likelihood</div>
                <button
                  type="button"
                  onClick={handleMatrixClick.bind(null, 'Low', 'Low')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Low' && impact === 'Low'
                      ? 'bg-green-400 ring-2 ring-green-600'
                      : 'bg-green-300 hover:bg-green-400'
                  }`}
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={handleMatrixClick.bind(null, 'Low', 'Medium')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Low' && impact === 'Medium'
                      ? 'bg-green-300 ring-2 ring-green-600'
                      : 'bg-green-200 hover:bg-green-300'
                  }`}
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={handleMatrixClick.bind(null, 'Low', 'High')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Low' && impact === 'High'
                      ? 'bg-yellow-400 ring-2 ring-yellow-600'
                      : 'bg-yellow-300 hover:bg-yellow-400'
                  }`}
                >
                  5
                </button>
              </div>
            </div>
          </div>

          {/* Current Selection */}
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}