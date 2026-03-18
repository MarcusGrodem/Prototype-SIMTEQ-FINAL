import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { StatusBadge } from './StatusBadge';
import { X, ExternalLink } from 'lucide-react';
import { Risk, Control, risks, controls } from '../data/mockData';
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

  const getRiskScoreColor = (score: number) => {
    if (score >= 7) return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 4) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Risk Heatmap - Detailed View</DialogTitle>
          <DialogDescription>
            Interactive risk assessment matrix showing likelihood vs impact
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Heatmap Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-sm text-center">
              <div className="font-semibold text-gray-700">Likelihood / Impact</div>
              <div className="font-semibold text-gray-700">Low Impact</div>
              <div className="font-semibold text-gray-700">Medium Impact</div>
              <div className="font-semibold text-gray-700">High Impact</div>
            </div>

            {heatmapData.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-4 gap-2">
                <div className="flex items-center justify-center text-sm font-semibold text-gray-700">
                  {row[0].likelihood} Likelihood
                </div>
                {row.map((cell, cellIdx) => (
                  <button
                    key={cellIdx}
                    onClick={handleCellClick.bind(null, cell)}
                    disabled={cell.risks.length === 0}
                    className={`h-24 rounded-lg flex flex-col items-center justify-center text-lg font-bold transition-all ${getCellColor(cell.likelihood, cell.impact)} ${
                      cell.risks.length > 0 ? 'cursor-pointer shadow-sm hover:shadow-md' : 'opacity-50 cursor-not-allowed'
                    } ${selectedCell?.likelihood === cell.likelihood && selectedCell?.impact === cell.impact ? 'ring-4 ring-blue-500' : ''}`}
                  >
                    <div>{cell.risks.length}</div>
                    <div className="text-xs font-normal mt-1 opacity-75">
                      {cell.risks.length === 1 ? 'risk' : 'risks'}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Risk Severity Legend</p>
            <div className="grid grid-cols-5 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-300 rounded"></div>
                <span className="text-gray-600">Very Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-200 rounded"></div>
                <span className="text-gray-600">Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-yellow-300 rounded"></div>
                <span className="text-gray-600">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-400 rounded"></div>
                <span className="text-gray-600">High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-400 rounded"></div>
                <span className="text-gray-600">Critical</span>
              </div>
            </div>
          </div>

          {/* Selected Cell Details */}
          {selectedCell && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedCell.likelihood} Likelihood / {selectedCell.impact} Impact
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedCell.risks.length} {selectedCell.risks.length === 1 ? 'risk' : 'risks'} • {selectedCell.controls.length} linked {selectedCell.controls.length === 1 ? 'control' : 'controls'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCloseDetails}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Risks in this cell */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Risks</h4>
                  <div className="space-y-2">
                    {selectedCell.risks.map((risk) => (
                      <div
                        key={risk.id}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-900">{risk.id}</span>
                              <Badge variant="outline" className="text-xs">
                                {risk.category}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={`text-xs font-semibold border ${getRiskScoreColor(risk.riskScore)}`}
                              >
                                Score: {risk.riskScore}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-900 mb-2">{risk.title}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>Owner: {risk.owner}</span>
                              <span>•</span>
                              <span>Last Review: {risk.lastReview}</span>
                              <span>•</span>
                              <span>{risk.relatedControls.length} linked controls</span>
                            </div>
                          </div>
                          <StatusBadge status={risk.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Controls linked to these risks */}
                {selectedCell.controls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Linked Controls</h4>
                    <div className="space-y-2">
                      {selectedCell.controls.map((control) => (
                        <div
                          key={control.id}
                          className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-gray-900">{control.id}</span>
                                <Badge variant="outline" className="text-xs">
                                  {control.category}
                                </Badge>
                                <Badge variant="outline" className="text-xs bg-white">
                                  {control.frequency}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-900 mb-2">{control.title}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>Owner: {control.owner}</span>
                                <span>•</span>
                                <span>Next Due: {control.nextDue}</span>
                              </div>
                            </div>
                            <StatusBadge status={control.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!selectedCell && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">Click on any cell with risks to view details</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}