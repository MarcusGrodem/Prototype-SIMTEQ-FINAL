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

interface AddControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export function AddControlDialog({ open, onOpenChange }: AddControlDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    frequency: '',
    owner: '',
    description: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate adding control and evidence
    if (uploadedFiles.length > 0) {
      toast.success('Control added successfully!', {
        description: `${formData.title} has been added with ${uploadedFiles.length} evidence file(s) automatically added to the Evidence Bank.`
      });
    } else {
      toast.success('Control added successfully!', {
        description: `${formData.title} has been added to the control registry.`
      });
    }
    
    // Reset form and close
    setFormData({
      title: '',
      category: '',
      frequency: '',
      owner: '',
      description: ''
    });
    setUploadedFiles([]);
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));
      setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
      toast.info('Files added', {
        description: `${newFiles.length} file(s) will be uploaded to the Evidence Bank`
      });
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setUploadedFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                required
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Access Control">Access Control</SelectItem>
                  <SelectItem value="Data Management">Data Management</SelectItem>
                  <SelectItem value="Network Security">Network Security</SelectItem>
                  <SelectItem value="Business Continuity">Business Continuity</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                  <SelectItem value="Monitoring">Monitoring</SelectItem>
                  <SelectItem value="Third Party">Third Party</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                required
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

          <div className="space-y-2">
            <Label htmlFor="owner">Responsible Owner *</Label>
            <Select
              value={formData.owner}
              onValueChange={(value) => setFormData({ ...formData, owner: value })}
              required
            >
              <SelectTrigger id="owner">
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="John Smith">John Smith</SelectItem>
                <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                <SelectItem value="Mike Chen">Mike Chen</SelectItem>
                <SelectItem value="Emily Brown">Emily Brown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the control objectives and procedures..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />
          </div>

          {/* Evidence Upload Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label>Evidence Documents</Label>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {uploadedFiles.length} file(s)
              </Badge>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Upload Evidence Files
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Files will be automatically added to the Evidence Bank
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Files
                </Button>
                <input
                  id="fileInput"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                />
              </div>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Uploaded Files:</p>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div 
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(file.name)}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-gray-400 hover:text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Upload className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    These files will be automatically linked to this control and added to the Evidence & Documentation bank.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="submit">
              {uploadedFiles.length > 0 ? `Add Control & ${uploadedFiles.length} Evidence File(s)` : 'Add Control'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}