import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { StatusBadge } from './StatusBadge';
import { X, ExternalLink } from 'lucide-react';
import { Risk, Control, risks, controls } from '../data/mockData';
import { getRiskScoreColor } from '../utils/riskUtils';
import { useState, useCallback } from 'react';
import { Button } from './ui/button';

interface RiskHeatmapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HeatmapCell {
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  risks: Risk[];
  controls: Control[];
}

export function RiskHeatmapDialog({ open, onOpenChange }: RiskHeatmapDialogProps) {
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  // Build heatmap cells with associated risks and controls
  const buildHeatmapData = useCallback((): HeatmapCell[][] => {
    const likelihoods: Array<'Low' | 'Medium' | 'High'> = ['High', 'Medium', 'Low'];
    const impacts: Array<'Low' | 'Medium' | 'High'> = ['Low', 'Medium', 'High'];
    
    return likelihoods.map(likelihood => 
      impacts.map(impact => {
        // Get risks for this cell
        const cellRisks = risks.filter(
          r => r.likelihood === likelihood && r.impact === impact
        );
        
        // Get controls linked to these risks
        const linkedControlIds = new Set(
          cellRisks.flatMap(r => r.relatedControls)
        );
        const cellControls = controls.filter(c => linkedControlIds.has(c.id));
        
        return {
          likelihood,
          impact,
          risks: cellRisks,
          controls: cellControls
        };
      })
    );
  }, []);

  const heatmapData = buildHeatmapData();

  const handleCellClick = useCallback((cell: HeatmapCell) => {
    if (cell.risks.length > 0) {
      setSelectedCell(cell);
    }
  }, []);

  const handleCloseDetails = useCallback(() => {
    setSelectedCell(null);
  }, []);

  const getCellColor = (likelihood: string, impact: string) => {
    if (likelihood === 'High' && impact === 'Low') return 'bg-yellow-200 hover:bg-yellow-300';
    if (likelihood === 'High' && impact === 'Medium') return 'bg-orange-300 hover:bg-orange-400';
    if (likelihood === 'High' && impact === 'High') return 'bg-red-400 hover:bg-red-500 text-white';
    if (likelihood === 'Medium' && impact === 'Low') return 'bg-green-200 hover:bg-green-300';
    if (likelihood === 'Medium' && impact === 'Medium') return 'bg-yellow-300 hover:bg-yellow-400';
    if (likelihood === 'Medium' && impact === 'High') return 'bg-orange-400 hover:bg-orange-500';
    if (likelihood === 'Low' && impact === 'Low') return 'bg-green-300 hover:bg-green-400';
    if (likelihood === 'Low' && impact === 'Medium') return 'bg-green-200 hover:bg-green-300';
    if (likelihood === 'Low' && impact === 'High') return 'bg-yellow-300 hover:bg-yellow-400';
    return 'bg-gray-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Risk Matrix</DialogTitle>
          <DialogDescription>
            Click a cell to see the risks in that zone.
          </DialogDescription>
        </DialogHeader>

        {/* Two-column layout: matrix left, details right */}
        <div className="flex gap-0 min-h-0 flex-1 overflow-hidden -mx-6 mt-2">

          {/* Left panel — matrix + legend */}
          <div className="w-72 shrink-0 px-6 flex flex-col gap-4 overflow-y-auto">
            {/* Column headers */}
            <div className="grid grid-cols-4 gap-1.5 text-xs text-center">
              <div className="text-slate-400 font-medium text-left self-end pb-1">Likelihood</div>
              <div className="font-medium text-slate-500">Low</div>
              <div className="font-medium text-slate-500">Med</div>
              <div className="font-medium text-slate-500">High</div>
            </div>

            {/* Matrix rows */}
            <div className="space-y-1.5">
              {heatmapData.map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-4 gap-1.5 items-center">
                  <div className="text-xs font-medium text-slate-400">{row[0].likelihood}</div>
                  {row.map((cell, cellIdx) => (
                    <button
                      key={cellIdx}
                      onClick={handleCellClick.bind(null, cell)}
                      disabled={cell.risks.length === 0}
                      className={`h-14 rounded-md flex flex-col items-center justify-center text-sm font-bold transition-all ${getCellColor(cell.likelihood, cell.impact)} ${
                        cell.risks.length > 0 ? 'cursor-pointer hover:shadow-sm' : 'opacity-40 cursor-not-allowed'
                      } ${selectedCell?.likelihood === cell.likelihood && selectedCell?.impact === cell.impact ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                    >
                      <span className="tabular-nums">{cell.risks.length}</span>
                      <span className="text-[10px] font-normal opacity-75 mt-0.5">
                        {cell.risks.length === 1 ? 'risk' : 'risks'}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
              <p className="text-xs text-slate-400 text-center pt-1">Impact →</p>
            </div>

            {/* Legend */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Severity</p>
              {[
                { color: 'bg-green-300', label: 'Very Low' },
                { color: 'bg-green-200', label: 'Low' },
                { color: 'bg-yellow-300', label: 'Medium' },
                { color: 'bg-orange-400', label: 'High' },
                { color: 'bg-red-400', label: 'Critical' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${color} shrink-0`} />
                  <span className="text-xs text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-slate-200 shrink-0" />

          {/* Right panel — details */}
          <div className="flex-1 px-6 overflow-y-auto">
            {!selectedCell ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <p className="text-sm font-medium text-slate-600">Select a cell</p>
                <p className="text-xs text-slate-400 mt-1">Click any cell in the matrix to view the risks in that zone.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Cell header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {selectedCell.likelihood} Likelihood · {selectedCell.impact} Impact
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedCell.risks.length} {selectedCell.risks.length === 1 ? 'risk' : 'risks'} · {selectedCell.controls.length} linked {selectedCell.controls.length === 1 ? 'control' : 'controls'}
                    </p>
                  </div>
                  <button onClick={handleCloseDetails} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Risks */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Risks</p>
                  {selectedCell.risks.map((risk) => (
                    <div key={risk.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-500 tabular-nums">{risk.id}</span>
                            <Badge variant="outline" className="text-xs">{risk.category}</Badge>
                            <Badge variant="outline" className={`text-xs font-semibold border ${getRiskScoreColor(risk.riskScore)}`}>
                              Score {risk.riskScore}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-900 mt-1.5 leading-snug">{risk.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{risk.owner} · {risk.lastReview}</p>
                        </div>
                        <StatusBadge status={risk.status} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Linked controls */}
                {selectedCell.controls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Linked Controls</p>
                    {selectedCell.controls.map((control) => (
                      <div key={control.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-500 tabular-nums">{control.id}</span>
                              <Badge variant="outline" className="text-xs">{control.category}</Badge>
                              <Badge variant="outline" className="text-xs bg-white">{control.frequency}</Badge>
                            </div>
                            <p className="text-sm text-slate-900 mt-1.5 leading-snug">{control.title}</p>
                            <p className="text-xs text-slate-400 mt-1">{control.owner} · Due {control.nextDue}</p>
                          </div>
                          <StatusBadge status={control.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}