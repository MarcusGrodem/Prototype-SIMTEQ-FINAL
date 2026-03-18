import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { StatusBadge } from '../components/StatusBadge';
import { EditRiskDialog } from '../components/EditRiskDialog';
import { AddRiskDialog } from '../components/AddRiskDialog';
import { 
  Search,
  Filter,
  Download,
  Plus,
  ExternalLink
} from 'lucide-react';
import { risks, Risk } from '../data/mockData';
import { useState, useCallback } from 'react';

export function RiskRegister() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Handle risk edit click
  const handleEditRisk = useCallback((risk: Risk) => {
    setSelectedRisk(risk);
    setEditDialogOpen(true);
  }, []);

  const filteredRisks = risks.filter(risk =>
    risk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    risk.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    risk.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskScoreColor = (score: number) => {
    if (score >= 7) return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 4) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Risk Register</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor organizational risks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Risk
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Risks</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{risks.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">High Risk</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">
            {risks.filter(r => r.riskScore >= 7).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Medium Risk</p>
          <p className="text-2xl font-semibold text-yellow-600 mt-1">
            {risks.filter(r => r.riskScore >= 4 && r.riskScore < 7).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Low Risk</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {risks.filter(r => r.riskScore < 4).length}
          </p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search risks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </Card>

      {/* Risks Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-700">Risk ID</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Risk Description</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Category</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Likelihood</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Impact</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Risk Score</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Owner</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Controls</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRisks.map((risk) => (
                <tr 
                  key={risk.id} 
                  className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={handleEditRisk.bind(null, risk)}
                >
                  <td className="p-4">
                    <span className="text-sm font-medium text-gray-900">{risk.id}</span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm text-gray-900 font-medium">{risk.title}</p>
                      <p className="text-xs text-gray-500 mt-1">Last review: {risk.lastReview}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs">
                      {risk.category}
                    </Badge>
                  </td>
                  <td className="p-4">
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
                  </td>
                  <td className="p-4">
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
                  </td>
                  <td className="p-4">
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-semibold border ${getRiskScoreColor(risk.riskScore)}`}
                    >
                      {risk.riskScore}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {risk.owner.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700">{risk.owner}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={risk.status} />
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {risk.relatedControls.length} linked
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center text-gray-400">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredRisks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No risks found matching your search.</p>
        </div>
      )}

      <EditRiskDialog risk={selectedRisk} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      <AddRiskDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}