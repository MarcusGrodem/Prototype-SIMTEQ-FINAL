import { useEffect, useState } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import { supabase } from '../../lib/supabase';
import type { AuditLogEntry } from '../../lib/types';

const TABLE_FILTERS = [
  { key: 'all', label: 'All tables' },
  { key: 'controls', label: 'Controls' },
  { key: 'risks', label: 'Risks' },
  { key: 'control_executions', label: 'Control Executions' },
  { key: 'documents', label: 'Documents' },
  { key: 'deviations', label: 'Deviations' },
  { key: 'remediation_actions', label: 'Remediation' },
  { key: 'auditor_requests', label: 'Auditor Requests' },
  { key: 'management_assertions', label: 'Management Assertions' },
  { key: 'audit_periods', label: 'Audit Periods' },
  { key: 'import_runs', label: 'Import Runs' },
];

const ACTION_BADGE: Record<string, string> = {
  INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
};

export function AuditTrailPanel({ defaultLimit = 25 }: { defaultLimit?: number } = {}) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(defaultLimit);
    if (tableFilter !== 'all') query = query.eq('table_name', tableFilter);
    const { data, error: queryError } = await query;
    if (queryError) {
      setError(queryError.message);
      setEntries([]);
    } else {
      setEntries((data ?? []) as AuditLogEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilter]);

  return (
    <Card className="border-slate-200 shadow-none">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-slate-500" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Audit trail</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable record of inserts, updates, and deletes on compliance tables.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_FILTERS.map(option => (
                <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="border-slate-200 text-slate-600 gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-5 py-3 text-xs text-red-700 bg-red-50 border-b border-red-100">
          Could not load audit log: {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">When</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Action</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Table</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Record</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Actor</th>
              <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map(entry => (
              <tr key={entry.id} className="hover:bg-slate-50/60 align-top">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatTimestamp(entry.created_at)}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={ACTION_BADGE[entry.action] ?? 'bg-slate-50 text-slate-700 border-slate-200'}>
                    {entry.action}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-700 font-mono text-[11px]">{entry.table_name}</td>
                <td className="px-4 py-3 text-slate-700 font-mono text-[11px] max-w-[180px] truncate" title={entry.record_id ?? undefined}>
                  {entry.record_id ?? '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate" title={entry.actor_email ?? undefined}>
                  {entry.actor_email ?? entry.actor_name ?? (entry.actor_id ? entry.actor_id.slice(0, 8) + '…' : 'System')}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {summarizeChange(entry)}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  {loading ? 'Loading audit trail…' : 'No audit log entries recorded yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-2 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
        Showing latest {entries.length} of last {defaultLimit} entries. Records are append-only.
      </div>
    </Card>
  );
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function summarizeChange(entry: AuditLogEntry): string {
  if (entry.action === 'INSERT') {
    const titleField = pickTitle(entry.after_data);
    return titleField ? `Created (${titleField})` : 'Created';
  }
  if (entry.action === 'DELETE') {
    const titleField = pickTitle(entry.before_data);
    return titleField ? `Deleted (${titleField})` : 'Deleted';
  }
  if (entry.action === 'UPDATE' && entry.before_data && entry.after_data) {
    const changed = Object.keys(entry.after_data).filter(key => {
      if (key === 'updated_at' || key === 'created_at') return false;
      return JSON.stringify(entry.before_data?.[key]) !== JSON.stringify(entry.after_data?.[key]);
    });
    if (changed.length === 0) return 'Updated';
    return `Changed: ${changed.slice(0, 3).join(', ')}${changed.length > 3 ? ` +${changed.length - 3}` : ''}`;
  }
  return entry.action;
}

function pickTitle(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  for (const key of ['title', 'name', 'request_text', 'description', 'id']) {
    const value = data[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.length > 60 ? `${value.slice(0, 60)}…` : value;
    }
  }
  return null;
}
