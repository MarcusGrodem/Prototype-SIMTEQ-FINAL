import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { toast } from 'sonner';
import {
  Download,
  FileText,
  FileJson,
  FileSpreadsheet,
  Shield,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Database
} from 'lucide-react';
import { exportData, ExportFormat, ExportType } from '../utils/exportUtils';
import { dashboardMetrics } from '../data/mockData';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [selectedType, setSelectedType] = useState<ExportType>('full');

  const formats = [
    {
      id: 'csv' as ExportFormat,
      name: 'CSV',
      description: 'Excel-compatible spreadsheet',
      icon: FileSpreadsheet,
      color: 'bg-green-100 text-green-700 border-green-300'
    },
    {
      id: 'json' as ExportFormat,
      name: 'JSON',
      description: 'Structured data format',
      icon: FileJson,
      color: 'bg-blue-100 text-blue-700 border-blue-300'
    },
    {
      id: 'pdf' as ExportFormat,
      name: 'Text Report',
      description: 'Formatted text document',
      icon: FileText,
      color: 'bg-purple-100 text-purple-700 border-purple-300'
    }
  ];

  const exportTypes = [
    {
      id: 'full' as ExportType,
      name: 'Full Audit Package',
      description: 'Complete export with all controls, risks, and metrics',
      icon: Database,
      color: 'bg-blue-50 border-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      id: 'controls' as ExportType,
      name: 'Controls Only',
      description: `${dashboardMetrics.totalControls} controls with evidence and status`,
      icon: Shield,
      color: 'bg-green-50 border-green-200',
      iconColor: 'text-green-600'
    },
    {
      id: 'risks' as ExportType,
      name: 'Risk Register',
      description: `${dashboardMetrics.totalRisks} risks with assessments and mitigations`,
      icon: AlertTriangle,
      color: 'bg-orange-50 border-orange-200',
      iconColor: 'text-orange-600'
    },
    {
      id: 'compliance' as ExportType,
      name: 'Compliance Summary',
      description: 'Key metrics and compliance score overview',
      icon: TrendingUp,
      color: 'bg-purple-50 border-purple-200',
      iconColor: 'text-purple-600'
    }
  ];

  const handleExport = () => {
    try {
      exportData(selectedType, selectedFormat);
      const formatName = formats.find(f => f.id === selectedFormat)?.name || selectedFormat.toUpperCase();
      const typeName = exportTypes.find(t => t.id === selectedType)?.name || selectedType;
      
      toast.success('Export Completed', {
        description: `${typeName} exported as ${formatName} successfully.`,
        duration: 4000,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast.error('Export Failed', {
        description: 'There was an error generating your export. Please try again.',
        duration: 4000,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Export for Auditor</DialogTitle>
              <DialogDescription>
                Generate compliance documentation and audit packages
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Export Type Selection */}
          <div>
            <Label className="text-sm font-semibold text-slate-900 mb-3 block">
              Select Export Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {exportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : `${type.color} hover:border-slate-300`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 ${
                        selectedType === type.id ? 'bg-blue-100' : 'bg-white'
                      } rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${
                          selectedType === type.id ? 'text-blue-600' : type.iconColor
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-sm font-semibold ${
                            selectedType === type.id ? 'text-blue-900' : 'text-slate-900'
                          }`}>
                            {type.name}
                          </p>
                          {selectedType === type.id && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <Label className="text-sm font-semibold text-slate-900 mb-3 block">
              Select File Format
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {formats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      selectedFormat === format.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-12 h-12 ${
                      selectedFormat === format.id ? 'bg-blue-100' : 'bg-slate-50'
                    } rounded-lg flex items-center justify-center mx-auto mb-2`}>
                      <Icon className={`w-6 h-6 ${
                        selectedFormat === format.id ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                    </div>
                    <p className={`text-sm font-semibold mb-1 ${
                      selectedFormat === format.id ? 'text-blue-900' : 'text-slate-900'
                    }`}>
                      {format.name}
                    </p>
                    <p className="text-xs text-slate-500">{format.description}</p>
                    {selectedFormat === format.id && (
                      <Badge className="mt-2 bg-blue-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Information */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Export Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Export Type:</span>
                <span className="font-medium text-slate-900">
                  {exportTypes.find(t => t.id === selectedType)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">File Format:</span>
                <span className="font-medium text-slate-900">
                  {formats.find(f => f.id === selectedFormat)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Generated:</span>
                <span className="font-medium text-slate-900">
                  {new Date().toLocaleDateString('en-US')}
                </span>
              </div>
              {selectedType === 'full' && (
                <>
                  <div className="border-t border-slate-300 my-2 pt-2">
                    <p className="text-xs text-slate-500 mb-2">Includes:</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    {dashboardMetrics.totalControls} Controls
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    {dashboardMetrics.totalRisks} Risks
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    Dashboard Metrics & KPIs
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    Evidence Documentation
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">Ready for Auditor Review</p>
                <p className="text-xs text-blue-700 mt-1">
                  This export includes all necessary documentation for ISAE 3402 compliance verification.
                  All data is current as of {new Date().toLocaleDateString('en-US')}.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export {formats.find(f => f.id === selectedFormat)?.name}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}