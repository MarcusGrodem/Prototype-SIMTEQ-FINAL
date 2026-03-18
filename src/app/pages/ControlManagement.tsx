import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { StatusBadge } from '../components/StatusBadge';
import { AddControlDialog } from '../components/AddControlDialog';
import { ControlDetailsDialog } from '../components/ControlDetailsDialog';
import { 
  Search,
  Filter,
  Download,
  Plus,
  Upload,
  FileCheck,
  Calendar
} from 'lucide-react';
import { controls, Control } from '../data/mockData';
import { useState, useCallback } from 'react';

export function ControlManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Handle add control click
  const handleAddControl = useCallback(() => {
    setAddDialogOpen(true);
  }, []);

  // Handle control row click
  const handleControlClick = useCallback((control: Control) => {
    setSelectedControl(control);
    setDetailsDialogOpen(true);
  }, []);

  const filteredControls = controls.filter(control =>
    control.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    control.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    control.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Control Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor and execute internal controls</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={handleAddControl}>
            <Plus className="w-4 h-4 mr-2" />
            Add Control
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Controls</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{controls.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {controls.filter(c => c.status === 'Completed').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-semibold text-yellow-600 mt-1">
            {controls.filter(c => c.status === 'Pending').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">
            {controls.filter(c => c.status === 'Overdue').length}
          </p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search controls..."
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

      {/* Controls Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-700">Control ID</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Control Name</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Category</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Frequency</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Owner</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Last Execution</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Next Due</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Evidence</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {filteredControls.map((control) => (
                <tr 
                  key={control.id} 
                  className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={handleControlClick.bind(null, control)}
                >
                  <td className="p-4">
                    <span className="text-sm font-medium text-gray-900">{control.id}</span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm text-gray-900 font-medium">{control.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{control.description}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs">
                      {control.category}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-700">{control.frequency}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {control.owner.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700">{control.owner}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={control.status} />
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-700">{control.lastExecution}</span>
                  </td>
                  <td className="p-4">
                    <span className={`text-sm ${
                      control.status === 'Overdue' ? 'text-red-600 font-medium' : 'text-gray-700'
                    }`}>
                      {control.nextDue}
                    </span>
                  </td>
                  <td className="p-4">
                    {control.evidence.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700">{control.evidence.length}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                        Missing
                      </Badge>
                    )}
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredControls.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No controls found matching your search.</p>
        </div>
      )}

      <AddControlDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <ControlDetailsDialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} control={selectedControl} />
    </div>
  );
}