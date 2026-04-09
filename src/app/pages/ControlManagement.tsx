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
  Calendar,
  ChevronDown
} from 'lucide-react';
import { Control } from '../../lib/types';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { downloadCSV } from '../utils/exportUtils';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

export function ControlManagement() {
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterFrequency, setFilterFrequency] = useState<string[]>([]);
  const { profile } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('controls')
      .select('*')
      .order('id');
    if (error) toast.error('Failed to load controls');
    else setControls(data || []);
    setLoading(false);
  };

  const handleAddControl = useCallback(() => setAddDialogOpen(true), []);

  const handleControlClick = useCallback((control: Control) => {
    setSelectedControl(control);
    setDetailsDialogOpen(true);
  }, []);

  const categories = [...new Set(controls.map(c => c.category))].sort();

  const filteredControls = controls.filter(control => {
    const matchSearch = control.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      control.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      control.owner_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus.length === 0 || filterStatus.includes(control.status);
    const matchCategory = filterCategory.length === 0 || filterCategory.includes(control.category);
    const matchFrequency = filterFrequency.length === 0 || filterFrequency.includes(control.frequency);
    return matchSearch && matchStatus && matchCategory && matchFrequency;
  });

  const handleUploadEvidence = async (e: React.MouseEvent, control: Control) => {
    e.stopPropagation();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';
    input.onchange = async (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const toastId = toast.loading(`Uploading ${file.name}...`);
      const docId = crypto.randomUUID();
      const path = `controls/${control.id}/${docId}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(path, file);

      if (uploadError) {
        toast.dismiss(toastId);
        toast.error('Upload failed: ' + uploadError.message);
        return;
      }

      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          id: docId,
          name: file.name,
          file_type: file.type,
          uploaded_by_name: profile?.full_name ?? 'Unknown',
          file_path: path,
          file_size: file.size,
          current_version: 1
        })
        .select()
        .single();

      if (docError || !docData) {
        toast.dismiss(toastId);
        toast.error('Failed to save document record');
        return;
      }

      await supabase.from('document_versions').insert({
        document_id: docId,
        version: 1,
        file_path: path,
        file_size: file.size,
        changelog: 'Initial upload',
        uploaded_by_name: profile?.full_name ?? 'Unknown'
      });

      await supabase.from('document_links').insert({
        document_id: docId,
        link_type: 'control',
        link_id: control.id
      });

      toast.dismiss(toastId);
      toast.success('Evidence uploaded successfully!');
    };
    input.click();
  };

  const handleExport = () => {
    downloadCSV(filteredControls.map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      frequency: c.frequency,
      owner: c.owner_name,
      status: c.status,
      last_execution: c.last_execution ?? '',
      next_due: c.next_due ?? ''
    })), 'controls.csv');
  };

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Control Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor and execute internal controls</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
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
          <Button variant="outline" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
            {(filterStatus.length + filterCategory.length + filterFrequency.length) > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white text-xs">
                {filterStatus.length + filterCategory.length + filterFrequency.length}
              </Badge>
            )}
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>
        {filterOpen && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Status</p>
              {['Completed', 'Pending', 'Overdue'].map(s => (
                <label key={s} className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="checkbox" checked={filterStatus.includes(s)} onChange={() => toggleFilter(filterStatus, s, setFilterStatus)} className="rounded" />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Frequency</p>
              {['Monthly', 'Quarterly', 'Yearly'].map(f => (
                <label key={f} className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="checkbox" checked={filterFrequency.includes(f)} onChange={() => toggleFilter(filterFrequency, f, setFilterFrequency)} className="rounded" />
                  <span className="text-sm text-gray-700">{f}</span>
                </label>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Category</p>
              {categories.slice(0, 6).map(c => (
                <label key={c} className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="checkbox" checked={filterCategory.includes(c)} onChange={() => toggleFilter(filterCategory, c, setFilterCategory)} className="rounded" />
                  <span className="text-sm text-gray-700 truncate">{c}</span>
                </label>
              ))}
            </div>
          </div>
        )}
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
                <th className="text-left p-4 text-sm font-medium text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : filteredControls.map((control) => (
                <tr
                  key={control.id}
                  className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleControlClick(control)}
                >
                  <td className="p-4">
                    <span className="text-sm font-medium text-gray-900">{control.id}</span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm text-gray-900 font-medium">{control.title}</p>
                      {control.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">{control.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs">{control.category}</Badge>
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
                          {control.owner_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700">{control.owner_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={control.status} />
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-700">{control.last_execution ?? '—'}</span>
                  </td>
                  <td className="p-4">
                    <span className={`text-sm ${
                      control.status === 'Overdue' ? 'text-red-600 font-medium' : 'text-gray-700'
                    }`}>
                      {control.next_due ?? '—'}
                    </span>
                  </td>
                  <td className="p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleUploadEvidence(e, control)}
                      title="Upload evidence"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredControls.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No controls found matching your search.</p>
        </div>
      )}

      <AddControlDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={loadData} />
      <ControlDetailsDialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} control={selectedControl} onSuccess={loadData} />
    </div>
  );
}
