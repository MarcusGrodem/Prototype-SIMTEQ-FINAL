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

  const completed = controls.filter(c => c.status === 'Completed').length;
  const pending = controls.filter(c => c.status === 'Pending').length;
  const overdue = controls.filter(c => c.status === 'Overdue').length;

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900 leading-none">Control Management</h1>
            <p className="text-xs text-slate-400 mt-1.5">Monitor and execute internal controls</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 gap-1.5 cursor-pointer">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button size="sm" onClick={handleAddControl} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              Add Control
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-5 border-slate-200 border-l-[3px] border-l-slate-400 shadow-none rounded-lg">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Controls</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{controls.length}</p>
            <p className="text-xs text-slate-400 mt-3">across all categories</p>
          </Card>
          <Card className="p-5 border-slate-200 border-l-[3px] border-l-emerald-500 shadow-none rounded-lg">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Completed</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{completed}</p>
            <p className="text-xs text-emerald-600 mt-3 font-medium">{controls.length > 0 ? Math.round(completed / controls.length * 100) : 0}% completion rate</p>
          </Card>
          <Card className="p-5 border-slate-200 border-l-[3px] border-l-amber-500 shadow-none rounded-lg">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Pending</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{pending}</p>
            <p className="text-xs text-slate-400 mt-3">awaiting execution</p>
          </Card>
          <Card className="p-5 border-slate-200 border-l-[3px] border-l-red-500 shadow-none rounded-lg">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Overdue</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{overdue}</p>
            <p className="text-xs text-red-500 mt-3 font-medium">requires immediate action</p>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-slate-200 shadow-none">
          <div className="px-4 py-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search controls by name, category, or owner…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 focus:border-slate-400"
              />
            </div>
            <Button variant="outline" onClick={() => setFilterOpen(!filterOpen)} className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 cursor-pointer">
              <Filter className="w-4 h-4" />
              Filter
              {(filterStatus.length + filterCategory.length + filterFrequency.length) > 0 && (
                <span className="ml-1 bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded-full tabular-nums">
                  {filterStatus.length + filterCategory.length + filterFrequency.length}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          {filterOpen && (
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
                {['Completed', 'Pending', 'Overdue'].map(s => (
                  <label key={s} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={filterStatus.includes(s)} onChange={() => toggleFilter(filterStatus, s, setFilterStatus)} className="rounded border-slate-300" />
                    <span className="text-sm text-slate-700">{s}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Frequency</p>
                {['Monthly', 'Quarterly', 'Yearly'].map(f => (
                  <label key={f} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={filterFrequency.includes(f)} onChange={() => toggleFilter(filterFrequency, f, setFilterFrequency)} className="rounded border-slate-300" />
                    <span className="text-sm text-slate-700">{f}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</p>
                {categories.slice(0, 6).map(c => (
                  <label key={c} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={filterCategory.includes(c)} onChange={() => toggleFilter(filterCategory, c, setFilterCategory)} className="rounded border-slate-300" />
                    <span className="text-sm text-slate-700 truncate">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Controls Table */}
        <Card className="border-slate-200 shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Control Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Frequency</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Run</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Due</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">Loading…</td></tr>
                ) : filteredControls.map((control) => (
                  <tr
                    key={control.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => handleControlClick(control)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{control.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{control.title}</p>
                      {control.description && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{control.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">{control.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-700">{control.frequency}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-semibold text-slate-600">
                            {control.owner_name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm text-slate-700 whitespace-nowrap">{control.owner_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={control.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 tabular-nums">{control.last_execution ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm tabular-nums ${control.status === 'Overdue' ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                        {control.next_due ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleUploadEvidence(e, control)}
                        title="Upload evidence"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredControls.length === 0 && !loading && (
            <div className="text-center py-12 text-sm text-slate-400">No controls found matching your search.</div>
          )}
        </Card>

        <AddControlDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={loadData} />
        <ControlDetailsDialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} control={selectedControl} onSuccess={loadData} />
      </div>
    </div>
  );
}
