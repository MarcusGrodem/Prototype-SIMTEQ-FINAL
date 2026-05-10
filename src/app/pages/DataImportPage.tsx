import { useMemo, useState } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Upload,
  Wand2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import {
  buildAutoMapping,
  buildImportPreview,
  downloadTextFile,
  generateTemplateCsv,
  IMPORT_TARGET_BY_KEY,
  IMPORT_TARGETS,
  ImportMapping,
  ImportTarget,
  ImportTargetConfig,
  parseDelimitedText,
  ParsedSheet,
  runImport,
} from '../../lib/dataImport';

export function DataImportPage() {
  const { activePeriod } = useAuditPeriod();
  const [target, setTarget] = useState<ImportTarget>('control_objectives');
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<ParsedSheet>({ headers: [], rows: [] });
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [importing, setImporting] = useState(false);

  const config = IMPORT_TARGET_BY_KEY[target];

  const preview = useMemo(
    () => buildImportPreview(target, sheet, mapping, { activePeriodId: activePeriod?.id }),
    [activePeriod?.id, mapping, sheet, target]
  );

  const requiredMapped = config.fields
    .filter(field => field.required)
    .every(field => Boolean(mapping[field.key]));

  const canImport = sheet.rows.length > 0 && requiredMapped && preview.validRows > 0;

  const handleTargetChange = (nextTarget: ImportTarget) => {
    setTarget(nextTarget);
    setMapping(sheet.headers.length > 0 ? buildAutoMapping(sheet.headers, IMPORT_TARGET_BY_KEY[nextTarget]) : {});
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error('Excel files are not parsed yet', {
        description: 'Export the workbook tab as CSV or TSV, then import that file here.',
      });
      return;
    }

    const text = await file.text();
    const parsed = parseDelimitedText(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      toast.error('No rows found in file');
      return;
    }

    setFileName(file.name);
    setSheet(parsed);
    setMapping(buildAutoMapping(parsed.headers, config));
    toast.success('File parsed', {
      description: `${parsed.rows.length} row(s) detected with ${parsed.headers.length} column(s).`,
    });
  };

  const handleTemplate = () => {
    downloadTextFile(
      generateTemplateCsv(target),
      `${target}_template.csv`,
      'text/csv;charset=utf-8'
    );
  };

  const handleImport = async () => {
    if (!canImport) return;

    setImporting(true);
    const result = await runImport(preview);
    setImporting(false);

    if (result.errors.length > 0) {
      toast.error('Import failed', { description: result.errors[0] });
      return;
    }

    toast.success('Import complete', {
      description: `${result.inserted} row(s) imported. ${result.failed} invalid row(s) skipped.`,
    });
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Data Import</h1>
            <p className="text-xs text-slate-400 mt-2">Bring existing registers into the Type 2 workspace from CSV or TSV exports</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleTemplate} className="border-slate-200 text-slate-600 hover:text-slate-900 gap-1.5">
            <Download className="w-4 h-4" />
            Template
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="grid grid-cols-[320px_1fr] gap-6">
          <Card className="border-slate-200 shadow-none self-start">
            <div className="p-4 border-b border-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Import target</p>
              <p className="text-sm text-slate-600 mt-2">Choose what this file should create or update.</p>
            </div>
            <div className="p-3 space-y-1">
              {IMPORT_TARGETS.map(item => (
                <TargetButton
                  key={item.target}
                  item={item}
                  active={item.target === target}
                  onClick={() => handleTargetChange(item.target)}
                />
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-none">
              <div className="p-5 flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                    <h2 className="text-lg font-semibold text-slate-900">{config.label}</h2>
                    {config.requiresActivePeriod && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Period scoped</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-2 max-w-2xl">{config.description}</p>
                  {config.requiresActivePeriod && (
                    <p className="text-xs text-slate-500 mt-2">
                      Active period: <span className="font-medium text-slate-700">{activePeriod?.name ?? 'None selected'}</span>
                    </p>
                  )}
                </div>
                <div className="min-w-[260px]">
                  <Label htmlFor="import-file" className="text-xs font-semibold text-slate-600">CSV or TSV file</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv,.tsv,text/csv,text/tab-separated-values"
                    onChange={event => handleFile(event.target.files?.[0])}
                    className="mt-2"
                  />
                  {fileName && <p className="text-xs text-slate-500 mt-2 truncate">{fileName}</p>}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs leading-5 text-slate-600">
                  Excel is supported through CSV export in this first pass. Native `.xlsx` parsing and AI-assisted mapping are tracked in `DATA_IMPORT_PROGRESS.md`.
                </p>
              </div>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Column mapping</h2>
                  <p className="text-xs text-slate-500 mt-1">Headers are matched automatically. Adjust any field before importing.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMapping(buildAutoMapping(sheet.headers, config))}
                  disabled={sheet.headers.length === 0}
                  className="border-slate-200 text-slate-600 gap-1.5"
                >
                  <Wand2 className="w-4 h-4" />
                  Auto-map
                </Button>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {config.fields.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    <Select
                      value={mapping[field.key] ?? '__skip__'}
                      onValueChange={value => setMapping(prev => ({
                        ...prev,
                        [field.key]: value === '__skip__' ? '' : value,
                      }))}
                      disabled={sheet.headers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">Do not import</SelectItem>
                        {sheet.headers.map(header => (
                          <SelectItem key={header} value={header}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <Card className="border-slate-200 shadow-none">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
              <p className="text-xs text-slate-500 mt-1">
                {sheet.rows.length === 0
                  ? 'Upload a CSV or TSV file to preview rows.'
                  : `${preview.validRows} valid row(s), ${preview.invalidRows} invalid row(s).`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {preview.validRows} valid
              </Badge>
              <Badge variant="outline" className={preview.invalidRows > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'}>
                <XCircle className="w-3.5 h-3.5 mr-1" />
                {preview.invalidRows} invalid
              </Badge>
              <Button
                onClick={handleImport}
                disabled={!canImport || importing}
                className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : 'Import valid rows'}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500 font-semibold w-20">Row</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Mapped values</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500 font-semibold w-72">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.slice(0, 20).map(row => (
                  <tr key={row.rowNumber} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500 tabular-nums">{row.rowNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(row.values).filter(([, value]) => value).slice(0, 8).map(([key, value]) => (
                          <span key={key} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                            <span className="font-medium text-slate-800">{key}</span>
                            <span className="max-w-[220px] truncate">{value}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ValidationMessages errors={row.errors} warnings={row.warnings} />
                    </td>
                  </tr>
                ))}
                {preview.rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-sm text-slate-500">
                      No import file loaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {preview.rows.length > 20 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              Showing first 20 rows of {preview.rows.length}. All valid rows will be imported.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function TargetButton({ item, active, onClick }: { item: ImportTargetConfig; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-md px-3 py-2.5 transition-colors ${
        active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <p className="text-sm font-semibold">{item.label}</p>
      <p className={`text-xs mt-1 leading-4 ${active ? 'text-slate-300' : 'text-slate-500'}`}>{item.tableName}</p>
    </button>
  );
}

function ValidationMessages({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Ready
      </span>
    );
  }

  return (
    <div className="space-y-1">
      {errors.map(error => (
        <p key={error} className="flex gap-1.5 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </p>
      ))}
      {warnings.map(warning => (
        <p key={warning} className="flex gap-1.5 text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{warning}</span>
        </p>
      ))}
    </div>
  );
}
