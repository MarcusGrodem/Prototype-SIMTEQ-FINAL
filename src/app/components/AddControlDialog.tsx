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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Upload, FileText, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { generateNextId, formatFileSize } from '../utils/riskUtils';
import { useCategories } from '../hooks/useCategories';

interface AddControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}


export function AddControlDialog({ open, onOpenChange, onSuccess }: AddControlDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    frequency: '',
    owner: '',
    description: '',
    next_due: '',
    status: 'Pending'
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const { profile } = useAuth();
  const { categories } = useCategories();

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category || !formData.frequency || !formData.owner) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);

    const newId = await generateNextId('controls', 'C');

    const { error: insertError } = await supabase.from('controls').insert({
      id: newId,
      title: formData.title,
      category: formData.category,
      frequency: formData.frequency as 'Monthly' | 'Quarterly' | 'Yearly',
      owner_name: formData.owner,
      status: formData.status as 'Completed' | 'Pending' | 'Overdue',
      description: formData.description || null,
      next_due: formData.next_due || null,
      last_execution: null
    });

    if (insertError) {
      toast.error('Failed to create control');
      setSaving(false);
      return;
    }

    // Upload evidence files
    for (const uf of uploadedFiles) {
      const docId = crypto.randomUUID();
      const path = `controls/${newId}/${docId}-${uf.name}`;

      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(path, uf.file);

      if (uploadError) {
        toast.warning(`File ${uf.name} failed to upload: ${uploadError.message}`);
        continue;
      }

      await supabase.from('documents').insert({
        id: docId,
        name: uf.name,
        file_type: uf.type,
        uploaded_by_name: profile?.full_name ?? 'Unknown',
        file_path: path,
        file_size: uf.size,
        current_version: 1
      });

      await supabase.from('document_versions').insert({
        document_id: docId,
        version: 1,
        file_path: path,
        file_size: uf.size,
        changelog: 'Initial upload',
        uploaded_by_name: profile?.full_name ?? 'Unknown'
      });

      await supabase.from('document_links').insert({
        document_id: docId,
        link_type: 'control',
        link_id: newId
      });
    }

    if (uploadedFiles.length > 0) {
      toast.success('Control added successfully!', {
        description: `${formData.title} added with ${uploadedFiles.length} evidence file(s).`
      });
    } else {
      toast.success('Control added successfully!', {
        description: `${formData.title} has been added.`
      });
    }

    setFormData({ title: '', category: '', frequency: '', owner: '', description: '', next_due: '', status: 'Pending' });
    setUploadedFiles([]);
    setSaving(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        file
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast.info('Files added', { description: `${newFiles.length} file(s) will be uploaded` });
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Control</DialogTitle>
          <DialogDescription>
            Create a new internal control for compliance monitoring.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Control Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Database Encryption Review"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner">Responsible Owner *</Label>
              <Input
                id="owner"
                placeholder="e.g., Lars Hansen"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_due">Next Due Date</Label>
              <Input
                id="next_due"
                type="date"
                value={formData.next_due}
                onChange={(e) => setFormData({ ...formData, next_due: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Initial Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the control objectives and procedures..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Evidence Upload */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label>Evidence Documents</Label>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {uploadedFiles.length} file(s)
              </Badge>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">Upload Evidence Files</p>
                <p className="text-xs text-slate-500 mb-3">Files will be automatically added to Evidence Bank</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('controlFileInput')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Files
                </Button>
                <input
                  id="controlFileInput"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                />
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveFile(file.name)}>
                      <X className="w-4 h-4 text-slate-400 hover:text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : uploadedFiles.length > 0 ? `Add Control & ${uploadedFiles.length} Evidence File(s)` : 'Add Control'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
