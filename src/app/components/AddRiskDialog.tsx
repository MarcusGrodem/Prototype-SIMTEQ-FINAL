import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface AddRiskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RiskLevel = 'Low' | 'Medium' | 'High';

export function AddRiskDialog({ open, onOpenChange }: AddRiskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [owner, setOwner] = useState('');
  const [likelihood, setLikelihood] = useState<RiskLevel>('Low');
  const [impact, setImpact] = useState<RiskLevel>('Low');

  // Handle risk matrix cell click
  const handleMatrixClick = useCallback((l: RiskLevel, i: RiskLevel) => {
    setLikelihood(l);
    setImpact(i);
  }, []);

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
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a risk title');
      return;
    }
    if (!category.trim()) {
      toast.error('Please select a category');
      return;
    }
    if (!owner.trim()) {
      toast.error('Please enter a risk owner');
      return;
    }

    // In a real application, this would save to a database
    toast.success('Risk created successfully!', {
      description: `${title} has been added to the risk register.`
    });

    // Reset form
    setTitle('');
    setDescription('');
    setCategory('');
    setOwner('');
    setLikelihood('Low');
    setImpact('Low');
    
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setCategory('');
    setOwner('');
    setLikelihood('Low');
    setImpact('Low');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Risk</DialogTitle>
          <DialogDescription>
            Create a new risk entry for the risk register.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                Risk Title *
              </Label>
              <Input
                id="title"
                placeholder="e.g., Unauthorized access to customer data"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the risk in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                  Category *
                </Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category...</option>
                  <option value="Access Control">Access Control</option>
                  <option value="Data Security">Data Security</option>
                  <option value="Network Security">Network Security</option>
                  <option value="Asset Management">Asset Management</option>
                  <option value="Physical Security">Physical Security</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Business Continuity">Business Continuity</option>
                  <option value="Supplier Management">Supplier Management</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div>
                <Label htmlFor="owner" className="text-sm font-medium text-gray-700">
                  Risk Owner *
                </Label>
                <Input
                  id="owner"
                  placeholder="e.g., John Smith"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Risk Score Preview */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Current Risk Score</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Likelihood: {likelihood}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Impact: {impact}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                <Badge 
                  variant="outline" 
                  className={`text-2xl font-bold px-4 py-2 ${getRiskScoreColor(riskScore)}`}
                >
                  {riskScore}
                </Badge>
              </div>
            </div>
          </div>

          {/* Risk Matrix */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Risk Assessment Matrix</h3>
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
                  onClick={() => handleMatrixClick('High', 'Low')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'High' && impact === 'Low'
                      ? 'bg-yellow-300 ring-2 ring-yellow-600 scale-105'
                      : 'bg-yellow-200 hover:bg-yellow-300'
                  }`}
                >
                  3
                </button>
                <button
                  type="button"
                  onClick={() => handleMatrixClick('High', 'Medium')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'High' && impact === 'Medium'
                      ? 'bg-orange-400 ring-2 ring-orange-600 scale-105'
                      : 'bg-orange-300 hover:bg-orange-400'
                  }`}
                >
                  7
                </button>
                <button
                  type="button"
                  onClick={() => handleMatrixClick('High', 'High')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold text-white transition-all ${
                    likelihood === 'High' && impact === 'High'
                      ? 'bg-red-500 ring-2 ring-red-700 scale-105'
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
                  onClick={() => handleMatrixClick('Medium', 'Low')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Medium' && impact === 'Low'
                      ? 'bg-green-300 ring-2 ring-green-600 scale-105'
                      : 'bg-green-200 hover:bg-green-300'
                  }`}
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleMatrixClick('Medium', 'Medium')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Medium' && impact === 'Medium'
                      ? 'bg-yellow-400 ring-2 ring-yellow-600 scale-105'
                      : 'bg-yellow-300 hover:bg-yellow-400'
                  }`}
                >
                  5
                </button>
                <button
                  type="button"
                  onClick={() => handleMatrixClick('Medium', 'High')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Medium' && impact === 'High'
                      ? 'bg-orange-500 ring-2 ring-orange-700 scale-105'
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
                  onClick={() => handleMatrixClick('Low', 'Low')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Low' && impact === 'Low'
                      ? 'bg-green-400 ring-2 ring-green-600 scale-105'
                      : 'bg-green-300 hover:bg-green-400'
                  }`}
                >
                  1
                </button>
                <button
                  type="button"
                  onClick={() => handleMatrixClick('Low', 'Medium')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Low' && impact === 'Medium'
                      ? 'bg-green-300 ring-2 ring-green-600 scale-105'
                      : 'bg-green-200 hover:bg-green-300'
                  }`}
                >
                  2
                </button>
                <button
                  type="button"
                  onClick={() => handleMatrixClick('Low', 'High')}
                  className={`h-16 rounded flex items-center justify-center text-sm font-semibold transition-all ${
                    likelihood === 'Low' && impact === 'High'
                      ? 'bg-yellow-400 ring-2 ring-yellow-600 scale-105'
                      : 'bg-yellow-300 hover:bg-yellow-400'
                  }`}
                >
                  5
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Add Risk
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
