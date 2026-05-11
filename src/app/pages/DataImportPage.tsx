import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  Info,
  RefreshCw,
  Sparkles,
  Upload,
  Wand2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  buildImportPreview,
  computeFileChecksum,
  downloadTextFile,
  fetchImportRunRows,
  fetchImportRuns,
  generateTemplateCsv,
  IMPORT_TARGET_BY_KEY,
  IMPORT_TARGETS,
  ImportMapping,
  ImportTarget,
  ImportTargetConfig,
  MappingConfidence,
  MappingSuggestion,
  MappingSuggestionResult,
  ParsedSheet,
  ParsedWorkbook,
  parseWorkbookFile,
  runImport,
  suggestImportMapping,
} from '../../lib/dataImport';
import type { ImportRun, ImportRunRow, ImportRowTransformRecord } from '../../lib/types';

export function DataImportPage() {
  const { activePeriod } = useAuditPeriod();
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [target, setTarget] = useState<ImportTarget>('control_objectives');
  const [fileName, setFileName] = useState('');
  const [fileChecksum, setFileChecksum] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [sheet, setSheet] = useState<ParsedSheet>({ headers: [], rows: [] });
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [suggestions, setSuggestions] = useState<Record<string, MappingSuggestion>>({});
  const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [importRuns, setImportRuns] = useState<ImportRun[]>([]);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [rowLoadingRunId, setRowLoadingRunId] = useState<string | null>(null);
  const [runRowsById, setRunRowsById] = useState<Record<string, ImportRunRow[]>>({});

  const config = IMPORT_TARGET_BY_KEY[target];

  const preview = useMemo(
    () => buildImportPreview(target, sheet, mapping, { activePeriodId: activePeriod?.id }),
    [activePeriod?.id, mapping, sheet, target]
  );

  const requiredFields = config.fields.filter(field => field.required);
  const mappedRequired = requiredFields.filter(field => Boolean(mapping[field.key])).length;
  const mappedFields = config.fields.filter(field => Boolean(mapping[field.key])).length;
  const requiredMapped = mappedRequired === requiredFields.length;
  const hasFile = sheet.rows.length > 0;
  const needsPeriod = Boolean(config.requiresActivePeriod);
  const periodReady = !needsPeriod || Boolean(activePeriod);
  const canImport = hasFile && requiredMapped && periodReady && preview.validRows > 0;

  const currentStep = !hasFile ? 2 : !requiredMapped || !periodReady ? 3 : 4;

  const loadImportRuns = async () => {
    setHistoryLoading(true);
    try {
      setImportRuns(await fetchImportRuns(8));
    } catch (error) {
      toast.error('Could not load import history', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadImportRuns();
  }, []);

  const applyAutoMapping = (headers: string[], nextConfig: ImportTargetConfig) => {
    const result = suggestImportMapping(headers, nextConfig) as MappingSuggestionResult;
    setMapping(result.mapping);
    setSuggestions(result.suggestions);
    setManualOverrides(new Set());
    return result;
  };

  const handleTargetChange = (nextTarget: ImportTarget) => {
    setTarget(nextTarget);
    if (sheet.headers.length > 0) {
      applyAutoMapping(sheet.headers, IMPORT_TARGET_BY_KEY[nextTarget]);
    } else {
      setMapping({});
      setSuggestions({});
      setManualOverrides(new Set());
    }
  };

  const loadSheet = (book: ParsedWorkbook, sheetName: string) => {
    const parsed = book.parseSheet(sheetName);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      toast.error('No data rows found in sheet', {
        description: 'The first row must contain column headers and at least one row must contain data.',
      });
      return false;
    }
    setSheet(parsed);
    applyAutoMapping(parsed.headers, config);
    return true;
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    let book: ParsedWorkbook;
    try {
      book = await parseWorkbookFile(file);
    } catch (error) {
      toast.error('Could not read file', {
        description: error instanceof Error ? error.message : 'Unknown parse error.',
      });
      return;
    }

    if (book.sheetNames.length === 0) {
      toast.error('No sheets found', {
        description: 'The workbook does not contain any readable sheets.',
      });
      return;
    }

    const firstSheet = book.sheetNames[0];
    setWorkbook(book);
    setActiveSheetName(firstSheet);
    setFileName(file.name);

    const { checksum, size } = await computeFileChecksum(file);
    setFileChecksum(checksum);
    setFileSize(size);

    const ok = loadSheet(book, firstSheet);
    if (!ok) return;

    if (book.format === 'xlsx') {
      toast.success(book.sheetNames.length > 1 ? 'Workbook loaded — pick a sheet' : 'Workbook loaded', {
        description: book.sheetNames.length > 1
          ? `${book.sheetNames.length} sheets detected. Showing "${firstSheet}".`
          : `Sheet "${firstSheet}" loaded.`,
      });
    } else {
      toast.success('File loaded', {
        description: `${book.format.toUpperCase()} parsed.`,
      });
    }
  };

  const handleSheetChange = (name: string) => {
    if (!workbook) return;
    setActiveSheetName(name);
    loadSheet(workbook, name);
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
    const result = await runImport(preview, {
      fileName,
      importedByName: profile?.full_name ?? profile?.email ?? undefined,
      sourceType: workbook?.format ?? 'csv_tsv',
      sourceChecksum: fileChecksum,
      sourceFileSize: fileSize,
    });
    setImporting(false);
    await loadImportRuns();

    if (result.errors.length > 0 && result.inserted === 0) {
      toast.error('Import failed', { description: result.errors[0] });
      return;
    }

    if (result.failed > 0 || result.errors.length > 0) {
      toast.warning('Import completed with failures', {
        description: `${result.inserted} row(s) imported. ${result.failed} row(s) failed or were skipped.`,
      });
    } else {
      toast.success('Import complete', {
        description: `${result.inserted} row(s) imported.`,
      });
    }
  };

  const handleToggleRun = async (run: ImportRun) => {
    if (expandedRunId === run.id) {
      setExpandedRunId(null);
      return;
    }

    setExpandedRunId(run.id);
    if (runRowsById[run.id]) return;

    setRowLoadingRunId(run.id);
    try {
      const rows = await fetchImportRunRows(run.id);
      setRunRowsById(prev => ({ ...prev, [run.id]: rows }));
    } catch (error) {
      toast.error('Could not load import rows', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRowLoadingRunId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Data Import</h1>
            <p className="text-xs text-slate-500 mt-2">Import company registers from CSV or TSV exports. Review every row before writing to Supabase.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTemplate} className="border-slate-200 text-slate-600 hover:text-slate-900 gap-1.5">
              <Download className="w-4 h-4" />
              Download template
            </Button>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={!canImport || importing}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
            >
              <Upload className="w-4 h-4" />
              {importing ? 'Importing...' : `Import ${preview.validRows || ''} row${preview.validRows === 1 ? '' : 's'}`.trim()}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        <WorkflowStatus
          currentStep={currentStep}
          hasFile={hasFile}
          requiredMapped={requiredMapped}
          canImport={canImport}
        />

        <RecentImports
          runs={importRuns}
          rowsByRunId={runRowsById}
          expandedRunId={expandedRunId}
          loading={historyLoading}
          rowLoadingRunId={rowLoadingRunId}
          onRefresh={loadImportRuns}
          onToggleRun={handleToggleRun}
        />

        <div className="grid grid-cols-[300px_1fr] gap-6 items-start">
          <Card className="border-slate-200 shadow-none">
            <div className="p-4 border-b border-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">1. Choose destination</p>
              <p className="text-sm text-slate-600 mt-2">Pick the register this file should create or update.</p>
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
              <div className="p-5 grid grid-cols-[1fr_300px] gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                    <h2 className="text-lg font-semibold text-slate-900">{config.label}</h2>
                    {needsPeriod && (
                      <Badge variant="outline" className={periodReady ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}>
                        {periodReady ? 'Uses active period' : 'Needs active period'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-2 max-w-2xl">{config.description}</p>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <Metric label="Rows found" value={sheet.rows.length} />
                    <Metric label="Mapped fields" value={`${mappedFields}/${config.fields.length}`} />
                    <Metric label="Required mapped" value={`${mappedRequired}/${requiredFields.length}`} />
                  </div>

                  {needsPeriod && (
                    <div className={`mt-4 rounded-md border px-3 py-2 text-xs ${periodReady ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                      Active audit period: <span className="font-semibold">{activePeriod?.name ?? 'none'}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">2. Load file</p>
                  <p className="text-sm text-slate-700 mt-2">Excel workbook (.xlsx, .xls) or CSV/TSV export. Headers must be on the first row.</p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.xlsx,.xls,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={event => handleFile(event.target.files?.[0])}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 w-full border-slate-300 bg-white text-slate-700 hover:bg-slate-50 gap-1.5"
                  >
                    <Upload className="w-4 h-4" />
                    Select Excel or CSV/TSV
                  </Button>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] uppercase tracking-wide text-slate-500">
                    <span className="rounded border border-slate-200 bg-white px-2 py-1 text-center">Excel .xlsx</span>
                    <span className="rounded border border-slate-200 bg-white px-2 py-1 text-center">CSV / TSV</span>
                  </div>
                  {fileName ? (
                    <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                      Loaded: <span className="font-medium">{fileName}</span>
                      {workbook && (
                        <span className="ml-1 text-emerald-700">({workbook.format.toUpperCase()})</span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">The first row must contain headers.</p>
                  )}

                  {workbook && workbook.sheetNames.length > 1 && (
                    <div className="mt-3 space-y-1">
                      <Label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Worksheet</Label>
                      <Select value={activeSheetName} onValueChange={handleSheetChange}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choose a sheet" />
                        </SelectTrigger>
                        <SelectContent>
                          {workbook.sheetNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs leading-5 text-slate-600">
                  Native Excel parsing reads the first matching worksheet. Column mapping uses deterministic alias + token matching with confidence chips below — replaceable with an AI suggester via <code className="px-1 bg-slate-100 rounded">suggestImportMapping(...)</code>.
                </p>
              </div>
            </Card>

            <Card className="border-slate-200 shadow-none">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">3. Confirm columns</p>
                  <h2 className="text-sm font-semibold text-slate-900 mt-1">Map source columns to {config.label.toLowerCase()} fields</h2>
                  <p className="text-xs text-slate-500 mt-1">Required fields must be mapped before import. Confidence chips show how the suggestion was matched.</p>
                </div>
                <div className="flex items-center gap-2">
                  <SuggestionLegend suggestions={suggestions} fieldCount={config.fields.length} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => applyAutoMapping(sheet.headers, config)}
                    disabled={sheet.headers.length === 0}
                    className="border-slate-200 text-slate-600 gap-1.5"
                  >
                    <Wand2 className="w-4 h-4" />
                    Review suggestions
                  </Button>
                </div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-x-5 gap-y-4">
                {config.fields.map(field => {
                  const mapped = Boolean(mapping[field.key]);
                  const isManual = manualOverrides.has(field.key);
                  const suggestion = suggestions[field.key];
                  const effectiveConfidence: MappingConfidence = !mapped
                    ? 'none'
                    : isManual
                      ? 'manual'
                      : suggestion?.confidence ?? 'manual';
                  return (
                    <div key={field.key} className={`rounded-md border px-3 py-3 ${field.required && !mapped ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <Label className="text-xs font-medium text-slate-700">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </Label>
                        <ConfidenceChip confidence={effectiveConfidence} />
                      </div>
                      <Select
                        value={mapping[field.key] || '__skip__'}
                        onValueChange={value => {
                          const nextValue = value === '__skip__' ? '' : value;
                          setMapping(prev => ({ ...prev, [field.key]: nextValue }));
                          setManualOverrides(prev => {
                            const next = new Set(prev);
                            next.add(field.key);
                            return next;
                          });
                        }}
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
                      {mapped && !isManual && suggestion?.reason && (
                        <p className="mt-1.5 text-[11px] text-slate-500 truncate" title={suggestion.reason}>
                          {suggestion.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        <Card className="border-slate-200 shadow-none">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">4. Review and import</p>
              <h2 className="text-sm font-semibold text-slate-900 mt-1">Preview rows before writing to the database</h2>
              <p className="text-xs text-slate-500 mt-1">
                {hasFile ? `${preview.validRows} row(s) ready. ${preview.invalidRows} row(s) need changes.` : 'Load a CSV or TSV file to see the row preview.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {preview.validRows} ready
              </Badge>
              <Badge variant="outline" className={preview.invalidRows > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-500 border-slate-200'}>
                <XCircle className="w-3.5 h-3.5 mr-1" />
                {preview.invalidRows} blocked
              </Badge>
              {preview.transformCount > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  {preview.transformCount} cleanup{preview.transformCount === 1 ? '' : 's'}
                </Badge>
              )}
              <Button
                onClick={handleImport}
                disabled={!canImport || importing}
                className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
              >
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : 'Import ready rows'}
              </Button>
            </div>
          </div>

          <ImportBlocker
            hasFile={hasFile}
            requiredMapped={requiredMapped}
            periodReady={periodReady}
            needsPeriod={needsPeriod}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500 font-semibold w-20">Row</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Mapped values</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-slate-500 font-semibold w-80">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.slice(0, 20).map(row => (
                  <tr key={row.rowNumber} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-500 tabular-nums align-top">{row.rowNumber}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(row.values).filter(([, value]) => value).slice(0, 8).map(([key, value]) => (
                          <span key={key} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                            <span className="font-medium text-slate-800">{key}</span>
                            <span className="max-w-[220px] truncate">{value}</span>
                          </span>
                        ))}
                      </div>
                      {row.transforms.length > 0 && (
                        <TransformList transforms={row.transforms} />
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <ValidationMessages errors={row.errors} warnings={row.warnings} />
                    </td>
                  </tr>
                ))}
                {preview.rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-medium text-slate-700 mt-3">No file loaded</p>
                      <p className="text-xs text-slate-500 mt-1">Choose a destination and select a CSV or TSV file to start.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {preview.rows.length > 20 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              Showing first 20 rows of {preview.rows.length}. All ready rows will be imported.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function RecentImports({
  runs,
  rowsByRunId,
  expandedRunId,
  loading,
  rowLoadingRunId,
  onRefresh,
  onToggleRun,
}: {
  runs: ImportRun[];
  rowsByRunId: Record<string, ImportRunRow[]>;
  expandedRunId: string | null;
  loading: boolean;
  rowLoadingRunId: string | null;
  onRefresh: () => void;
  onToggleRun: (run: ImportRun) => void;
}) {
  return (
    <Card className="border-slate-200 shadow-none">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-slate-500" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent imports</h2>
            <p className="text-xs text-slate-500 mt-0.5">Run history with row-level failures for governance review.</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="border-slate-200 text-slate-600 gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold w-10"></th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Target</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">File</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Status</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Imported</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Failed</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">By</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.map(run => {
              const expanded = expandedRunId === run.id;
              return (
                <Fragment key={run.id}>
                  <tr key={run.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onToggleRun(run)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded border border-slate-200 text-slate-500"
                        aria-label={expanded ? 'Collapse import run' : 'Expand import run'}
                      >
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{formatImportTarget(run.target)}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate" title={run.file_name ?? undefined}>
                      <span>{run.file_name ?? 'Untitled import'}</span>
                      {run.source_checksum && (
                        <span className="block text-[10px] font-mono text-slate-400 truncate" title={run.source_checksum}>
                          sha256: {run.source_checksum.slice(0, 12)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusClassName(run.status)}>{formatRunStatus(run.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700 tabular-nums">{run.success_count}/{run.row_count}</td>
                    <td className={`px-4 py-3 tabular-nums ${run.failure_count > 0 ? 'text-red-700 font-medium' : 'text-slate-500'}`}>{run.failure_count}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{run.imported_by_name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatTimestamp(run.completed_at ?? run.started_at)}</td>
                  </tr>
                  {expanded && (
                    <tr key={`${run.id}-details`} className="bg-slate-50/70">
                      <td colSpan={8} className="px-4 py-3">
                        <RunDetailPanel
                          run={run}
                          rows={rowsByRunId[run.id] ?? []}
                          loading={rowLoadingRunId === run.id}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {runs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  {loading ? 'Loading import history...' : 'No imports recorded yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RunDetailPanel({ run, rows, loading }: { run: ImportRun; rows: ImportRunRow[]; loading: boolean }) {
  if (loading) {
    return <p className="text-xs text-slate-500">Loading run details…</p>;
  }

  const failedRows = rows.filter(row => row.status === 'failed');
  const rowsWithTransforms = rows.filter(row => Array.isArray(row.transforms) && row.transforms.length > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <DetailMeta label="Source format" value={run.source_type.toUpperCase()} />
        <DetailMeta
          label="Source size"
          value={typeof run.source_file_size === 'number' ? formatBytes(run.source_file_size) : '—'}
        />
        <DetailMeta
          label="SHA-256"
          value={run.source_checksum ? run.source_checksum : '—'}
          mono
          title={run.source_checksum ?? undefined}
        />
        <DetailMeta
          label="Started"
          value={formatTimestamp(run.started_at)}
        />
      </div>

      {failedRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Failed rows</p>
          {failedRows.slice(0, 10).map(row => (
            <div key={row.id} className="rounded-md border border-red-100 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-red-700">Row {row.row_number}</p>
              <p className="text-xs text-slate-700 mt-1">{row.error_message ?? 'No error message recorded.'}</p>
            </div>
          ))}
          {failedRows.length > 10 && (
            <p className="text-xs text-slate-500">Showing first 10 of {failedRows.length} failed rows.</p>
          )}
        </div>
      )}

      {rowsWithTransforms.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Cleanups recorded</p>
          {rowsWithTransforms.slice(0, 5).map(row => (
            <div key={row.id} className="rounded-md border border-blue-100 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold text-blue-700">Row {row.row_number}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(row.transforms as ImportRowTransformRecord[]).slice(0, 6).map((t, idx) => (
                  <span key={`${t.field}-${idx}`} className="inline-flex items-center gap-1 rounded border border-blue-100 bg-blue-50/70 px-2 py-0.5 text-[10px] text-blue-900">
                    <span className="font-medium">{t.field}</span>
                    {t.original && <span className="text-blue-700/70 line-through max-w-[100px] truncate">{t.original}</span>}
                    <span>→</span>
                    <span className="font-medium">{t.normalized}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
          {rowsWithTransforms.length > 5 && (
            <p className="text-xs text-slate-500">Showing first 5 of {rowsWithTransforms.length} rows with cleanups.</p>
          )}
        </div>
      )}

      {failedRows.length === 0 && rowsWithTransforms.length === 0 && (
        <p className="text-xs text-slate-500">No row-level failures or cleanups recorded for this run.</p>
      )}
    </div>
  );
}

function DetailMeta({ label, value, mono, title }: { label: string; value: string; mono?: boolean; title?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 truncate ${mono ? 'font-mono text-[11px] text-slate-700' : 'text-xs text-slate-800'}`} title={title}>
        {value}
      </p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function WorkflowStatus({
  currentStep,
  hasFile,
  requiredMapped,
  canImport,
}: {
  currentStep: number;
  hasFile: boolean;
  requiredMapped: boolean;
  canImport: boolean;
}) {
  const steps = [
    { number: 1, label: 'Choose destination', done: true },
    { number: 2, label: 'Load file', done: hasFile },
    { number: 3, label: 'Confirm columns', done: hasFile && requiredMapped },
    { number: 4, label: 'Import rows', done: canImport },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="grid grid-cols-4 gap-2">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center gap-2 min-w-0">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
              step.done ? 'bg-emerald-600 text-white' : step.number === currentStep ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {step.done ? <CheckCircle2 className="w-4 h-4" /> : step.number}
            </div>
            <span className={`text-sm truncate ${step.number === currentStep ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{step.label}</span>
            {index < steps.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300 ml-auto flex-shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatImportTarget(value: string) {
  const config = IMPORT_TARGET_BY_KEY[value as ImportTarget];
  return config?.label ?? value.replace(/_/g, ' ');
}

function formatRunStatus(status: ImportRun['status']) {
  return status.replace(/_/g, ' ');
}

function statusClassName(status: ImportRun['status']) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'completed_with_errors') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'failed') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 mt-1 tabular-nums">{value}</p>
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
      <p className={`text-xs mt-1 leading-4 ${active ? 'text-slate-300' : 'text-slate-500'}`}>{item.description}</p>
    </button>
  );
}

function ImportBlocker({
  hasFile,
  requiredMapped,
  periodReady,
  needsPeriod,
}: {
  hasFile: boolean;
  requiredMapped: boolean;
  periodReady: boolean;
  needsPeriod: boolean;
}) {
  const messages: string[] = [];
  if (!hasFile) messages.push('Load a CSV or TSV file.');
  if (hasFile && !requiredMapped) messages.push('Map every required field marked with an asterisk.');
  if (needsPeriod && !periodReady) messages.push('Activate an audit period before importing period-scoped rows.');

  if (messages.length === 0) return null;

  return (
    <div className="px-5 py-3 border-b border-amber-200 bg-amber-50 text-sm text-amber-900 flex items-start gap-3">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">Import is not ready yet</p>
        <p className="text-xs mt-1">{messages.join(' ')}</p>
      </div>
    </div>
  );
}

function ConfidenceChip({ confidence }: { confidence: MappingConfidence }) {
  const meta = CONFIDENCE_META[confidence];
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${meta.className}`}>
      {meta.label}
    </span>
  );
}

const CONFIDENCE_META: Record<MappingConfidence, { label: string; className: string }> = {
  exact: { label: 'Exact', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  alias: { label: 'Suggested', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  fuzzy: { label: 'Fuzzy', className: 'bg-amber-50 text-amber-800 border border-amber-200' },
  manual: { label: 'Manual', className: 'bg-slate-100 text-slate-700 border border-slate-200' },
  none: { label: 'Skipped', className: 'bg-slate-50 text-slate-400 border border-slate-200' },
};

function SuggestionLegend({ suggestions, fieldCount }: { suggestions: Record<string, MappingSuggestion>; fieldCount: number }) {
  const counts = { exact: 0, alias: 0, fuzzy: 0, none: 0 } as Record<string, number>;
  Object.values(suggestions).forEach(s => {
    counts[s.confidence] = (counts[s.confidence] ?? 0) + 1;
  });
  if (fieldCount === 0) return null;
  const mapped = (counts.exact ?? 0) + (counts.alias ?? 0) + (counts.fuzzy ?? 0);
  if (mapped === 0) return null;
  return (
    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-500">
      {(['exact', 'alias', 'fuzzy'] as const).map(level => counts[level] > 0 && (
        <span key={level} className="inline-flex items-center gap-1">
          <ConfidenceChip confidence={level} />
          <span className="tabular-nums">{counts[level]}</span>
        </span>
      ))}
    </div>
  );
}

function TransformList({ transforms }: { transforms: { field: string; original: string; normalized: string; reason: string }[] }) {
  return (
    <div className="mt-2 space-y-1">
      {transforms.slice(0, 4).map((t, i) => (
        <div key={`${t.field}-${i}`} className="inline-flex items-center gap-1.5 mr-1.5 rounded border border-blue-100 bg-blue-50/70 px-2 py-1 text-[11px] text-blue-900">
          <Sparkles className="w-3 h-3 text-blue-500" />
          <span className="font-medium">{t.field}</span>
          {t.original && (
            <>
              <span className="text-blue-700/70 line-through max-w-[120px] truncate">{t.original}</span>
              <ArrowRight className="w-3 h-3 text-blue-500" />
            </>
          )}
          <span className="font-medium">{t.normalized}</span>
          <span className="text-blue-700/80">— {t.reason}</span>
        </div>
      ))}
      {transforms.length > 4 && (
        <p className="text-[11px] text-slate-500">+{transforms.length - 4} more cleanup{transforms.length - 4 === 1 ? '' : 's'}</p>
      )}
    </div>
  );
}

function ValidationMessages({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Ready to import
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
