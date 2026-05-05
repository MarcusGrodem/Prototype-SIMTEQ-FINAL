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
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { Risk } from '../../lib/types';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { downloadCSV } from '../utils/exportUtils';
import { getRiskScoreColor } from '../utils/riskUtils';
import { toast } from 'sonner';
import { useCategories } from '../hooks/useCategories';

export function RiskRegister() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);
  const [filterLikelihood, setFilterLikelihood] = useState<string[]>([]);
  const [filterScoreBand, setFilterScoreBand] = useState<'high' | 'medium' | 'low' | null>(null);
  const { categories: dbCategories } = useCategories();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('risks')
      .select('*, risk_controls(control_id)')
      .order('id');
    if (error) { toast.error('Failed to load risks'); }
    else setRisks(data || []);
    setLoading(false);
  };

  const handleEditRisk = useCallback((risk: Risk) => {
    setSelectedRisk(risk);
    setEditDialogOpen(true);
  }, []);

  const categories = [
    ...new Set([
      ...dbCategories.map(c => c.name),
      ...risks.map(r => r.category),
    ]),
  ].sort();

  const filteredRisks = risks.filter(risk => {
    const matchSearch = risk.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.owner_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus.length === 0 || filterStatus.includes(risk.status);
    const matchCategory = filterCategory.length === 0 || filterCategory.includes(risk.category);
    const matchLikelihood = filterLikelihood.length === 0 || filterLikelihood.includes(risk.likelihood);
    const matchBand = filterScoreBand === null ||
      (filterScoreBand === 'high' && risk.risk_score >= 7) ||
      (filterScoreBand === 'medium' && risk.risk_score >= 4 && risk.risk_score < 7) ||
      (filterScoreBand === 'low' && risk.risk_score < 4);
    return matchSearch && matchStatus && matchCategory && matchLikelihood && matchBand;
  });

  const handleExport = () => {
    downloadCSV(filteredRisks.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      likelihood: r.likelihood,
      impact: r.impact,
      risk_score: r.risk_score,
      owner: r.owner_name,
      status: r.status,
      last_review: r.last_review ?? '',
      controls: (r.risk_controls ?? []).length
    })), 'risks.csv');
  };

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Risk Register</h1>
            <p className="text-xs text-slate-400 mt-2">Manage and monitor organisational risks</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 gap-1.5 cursor-pointer">
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              Add Risk
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Stats strip */}
        <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden divide-x divide-slate-200">
          <button
            onClick={() => setFilterScoreBand(null)}
            className={`flex-1 px-6 py-5 text-left transition-colors cursor-pointer ${filterScoreBand === null ? 'bg-slate-900' : 'hover:bg-slate-50'}`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-widest ${filterScoreBand === null ? 'text-slate-300' : 'text-slate-500'}`}>Total Risks</p>
            <p className={`text-3xl font-bold tabular-nums mt-2 ${filterScoreBand === null ? 'text-white' : 'text-slate-900'}`}>{risks.length}</p>
            <p className={`text-xs mt-3 ${filterScoreBand === null ? 'text-slate-400' : 'text-slate-400'}`}>in register</p>
          </button>
          <button
            onClick={() => setFilterScoreBand(prev => prev === 'high' ? null : 'high')}
            className={`flex-1 px-6 py-5 text-left transition-colors cursor-pointer ${filterScoreBand === 'high' ? 'bg-red-600' : 'bg-red-50/40 hover:bg-red-50'}`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-widest ${filterScoreBand === 'high' ? 'text-red-100' : 'text-slate-500'}`}>High Risk</p>
            <p className={`text-3xl font-bold tabular-nums mt-2 ${filterScoreBand === 'high' ? 'text-white' : 'text-red-600'}`}>{risks.filter(r => r.risk_score >= 7).length}</p>
            <p className={`text-xs mt-3 font-medium ${filterScoreBand === 'high' ? 'text-red-200' : 'text-red-500'}`}>score ≥ 7</p>
          </button>
          <button
            onClick={() => setFilterScoreBand(prev => prev === 'medium' ? null : 'medium')}
            className={`flex-1 px-6 py-5 text-left transition-colors cursor-pointer ${filterScoreBand === 'medium' ? 'bg-slate-900' : 'hover:bg-slate-50'}`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-widest ${filterScoreBand === 'medium' ? 'text-slate-300' : 'text-slate-500'}`}>Medium Risk</p>
            <p className={`text-3xl font-bold tabular-nums mt-2 ${filterScoreBand === 'medium' ? 'text-white' : 'text-slate-900'}`}>{risks.filter(r => r.risk_score >= 4 && r.risk_score < 7).length}</p>
            <p className={`text-xs mt-3 ${filterScoreBand === 'medium' ? 'text-slate-400' : 'text-slate-400'}`}>score 4–6</p>
          </button>
          <button
            onClick={() => setFilterScoreBand(prev => prev === 'low' ? null : 'low')}
            className={`flex-1 px-6 py-5 text-left transition-colors cursor-pointer ${filterScoreBand === 'low' ? 'bg-emerald-700' : 'hover:bg-slate-50'}`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-widest ${filterScoreBand === 'low' ? 'text-emerald-100' : 'text-slate-500'}`}>Low Risk</p>
            <p className={`text-3xl font-bold tabular-nums mt-2 ${filterScoreBand === 'low' ? 'text-white' : 'text-slate-900'}`}>{risks.filter(r => r.risk_score < 4).length}</p>
            <p className={`text-xs mt-3 font-medium ${filterScoreBand === 'low' ? 'text-emerald-200' : 'text-emerald-600'}`}>score &lt; 4</p>
          </button>
        </div>

        {/* Search and Filters */}
        <Card className="border-slate-200 shadow-none">
          <div className="px-4 py-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search risks by title, category, or owner…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 focus:border-slate-400"
              />
            </div>
            <Button variant="outline" onClick={() => setFilterOpen(!filterOpen)} className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 cursor-pointer">
              <Filter className="w-4 h-4" />
              Filter
              {(filterStatus.length + filterCategory.length + filterLikelihood.length) > 0 && (
                <span className="ml-1 bg-slate-900 text-white text-xs px-1.5 py-0.5 rounded-full tabular-nums">
                  {filterStatus.length + filterCategory.length + filterLikelihood.length}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          {filterOpen && (
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
                {['Active', 'Mitigated', 'Monitoring'].map(s => (
                  <label key={s} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={filterStatus.includes(s)} onChange={() => toggleFilter(filterStatus, s, setFilterStatus)} className="rounded border-slate-300" />
                    <span className="text-sm text-slate-700">{s}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Likelihood</p>
                {['Low', 'Medium', 'High'].map(l => (
                  <label key={l} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                    <input type="checkbox" checked={filterLikelihood.includes(l)} onChange={() => toggleFilter(filterLikelihood, l, setFilterLikelihood)} className="rounded border-slate-300" />
                    <span className="text-sm text-slate-700">{l}</span>
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

        {/* Risks Table */}
        <Card className="border-slate-200 shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Likelihood</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Impact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Controls</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-400">Loading…</td></tr>
              ) : filteredRisks.map((risk) => (
                <tr
                  key={risk.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleEditRisk(risk)}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">{risk.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{risk.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Last review: {risk.last_review ?? 'N/A'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">{risk.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs border ${
                      risk.likelihood === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                      risk.likelihood === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>{risk.likelihood}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs border ${
                      risk.impact === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                      risk.impact === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>{risk.impact}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs font-bold border ${getRiskScoreColor(risk.risk_score)}`}>
                      {risk.risk_score}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-slate-600">
                          {risk.owner_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm text-slate-700 whitespace-nowrap">{risk.owner_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={risk.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full">
                      {(risk.risk_controls ?? []).length} linked
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRisks.length === 0 && !loading && (
            <div className="text-center py-12 px-4">
              {searchTerm || filterStatus.length > 0 || filterCategory.length > 0 || filterLikelihood.length > 0 ? (
                <>
                  <p className="text-sm font-medium text-slate-600">No risks match your search</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search term.</p>
                  <button
                    onClick={() => { setSearchTerm(''); setFilterStatus([]); setFilterCategory([]); setFilterLikelihood([]); setFilterScoreBand(null); setFilterOpen(false); }}
                    className="mt-3 text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Clear all filters
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-600">No risks registered</p>
                  <p className="text-xs text-slate-400 mt-1">Document organisational risks to monitor and mitigate exposure.</p>
                  <button onClick={() => setAddDialogOpen(true)} className="mt-3 text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 transition-colors cursor-pointer">
                    Add first risk →
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

        <EditRiskDialog
          risk={selectedRisk}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={loadData}
        />
        <AddRiskDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={loadData}
        />
      </div>
    </div>
  );
}
