import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/StatusBadge';
import { ReminderDialog } from '../components/ReminderDialog';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Bell,
  X
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Control, ComplianceEvent } from '../../lib/types';
import { downloadCSV } from '../utils/exportUtils';
import { toast } from 'sonner';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentRealYear = new Date().getFullYear();

export function ComplianceCalendar() {
  const [controls, setControls] = useState<Control[]>([]);
  const [complianceEvents, setComplianceEvents] = useState<ComplianceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(currentRealYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  const currentMonth = new Date().getMonth();

  useEffect(() => { loadData(); }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    const yearStart = `${selectedYear}-01-01`;
    const yearEnd = `${selectedYear}-12-31`;

    const [ctrlRes, evtRes] = await Promise.all([
      supabase.from('controls').select('*')
        .gte('next_due', yearStart)
        .lte('next_due', yearEnd),
      supabase.from('compliance_events').select('*')
        .gte('date', yearStart)
        .lte('date', yearEnd)
        .order('date')
    ]);

    if (ctrlRes.error) toast.error('Failed to load controls');
    else setControls(ctrlRes.data || []);
    if (evtRes.data) setComplianceEvents(evtRes.data);
    setLoading(false);
  };

  const handleMonthClick = useCallback((idx: number) => {
    setSelectedMonth(prev => idx === prev ? null : idx);
  }, []);

  const handleClearSelection = useCallback(() => setSelectedMonth(null), []);
  const handleReminderClick = useCallback(() => setReminderDialogOpen(true), []);

  const controlsByMonth = months.map((month, idx) => {
    const monthControls = controls.filter(control => {
      if (!control.next_due) return false;
      const nextDueMonth = new Date(control.next_due).getMonth();
      return nextDueMonth === idx;
    });

    let highestPriorityStatus: 'Overdue' | 'Pending' | 'Completed' | null = null;
    if (monthControls.some(c => c.status === 'Overdue')) highestPriorityStatus = 'Overdue';
    else if (monthControls.some(c => c.status === 'Pending')) highestPriorityStatus = 'Pending';
    else if (monthControls.length > 0) highestPriorityStatus = 'Completed';

    return { month, controls: monthControls, count: monthControls.length, highestPriorityStatus };
  });

  const upcomingEvents = complianceEvents.slice(0, 8);

  const centerX = 300;
  const centerY = 300;
  const radius = 175;

  const monthPositions = months.map((month, idx) => {
    const angle = (idx * 30 - 90) * (Math.PI / 180);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { month, x, y, angle: idx * 30, ...controlsByMonth[idx] };
  });

  const handleExport = () => {
    downloadCSV(controls.map(c => ({
      id: c.id,
      title: c.title,
      frequency: c.frequency,
      owner: c.owner_name,
      status: c.status,
      next_due: c.next_due ?? '',
      last_execution: c.last_execution ?? ''
    })), `compliance_calendar_${selectedYear}.csv`);
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Compliance Calendar</h1>
            <p className="text-xs text-slate-400 mt-2">Track control deadlines and audit schedules</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReminderClick}>
              <Bell className="w-4 h-4 mr-2" />
              Set Reminders
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">This Month</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">
            {controlsByMonth[currentMonth].count}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Upcoming</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">
            {complianceEvents.filter(e => e.status === 'Upcoming').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">
            {complianceEvents.filter(e => e.status === 'Overdue').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {complianceEvents.filter(e => e.status === 'Completed').length}
          </p>
        </Card>
      </div>

      {/* Year Wheel */}
      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-slate-900">{selectedYear} Control Schedule</h2>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => { setSelectedYear(y => y - 1); setSelectedMonth(null); }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="min-w-16">
              {selectedYear}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setSelectedYear(y => y + 1); setSelectedMonth(null); }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <div className="flex justify-center">
            <svg width="600" height="600" viewBox="0 0 600 600" className="max-w-full">
              <circle cx={centerX} cy={centerY} r="250" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              <circle cx={centerX} cy={centerY} r="220" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              <circle cx={centerX} cy={centerY} r="190" fill="none" stroke="#e5e7eb" strokeWidth="1" />

              {monthPositions.map((monthData, idx) => {
                const isCurrentMonth = idx === currentMonth && selectedYear === currentRealYear;
                const isSelected = idx === selectedMonth;
                const startAngle = idx * 30 - 90;
                const endAngle = (idx + 1) * 30 - 90;
                const innerRadius = 100;
                const outerRadius = 250;
                const startRad = startAngle * (Math.PI / 180);
                const endRad = endAngle * (Math.PI / 180);
                const x1 = centerX + innerRadius * Math.cos(startRad);
                const y1 = centerY + innerRadius * Math.sin(startRad);
                const x2 = centerX + outerRadius * Math.cos(startRad);
                const y2 = centerY + outerRadius * Math.sin(startRad);
                const x3 = centerX + outerRadius * Math.cos(endRad);
                const y3 = centerY + outerRadius * Math.sin(endRad);
                const x4 = centerX + innerRadius * Math.cos(endRad);
                const y4 = centerY + innerRadius * Math.sin(endRad);
                const pathData = `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}`;
                const midAngle = (startAngle + endAngle) / 2;
                const midRad = midAngle * (Math.PI / 180);
                const textRadius = 175;
                const textX = centerX + textRadius * Math.cos(midRad);
                const textY = centerY + textRadius * Math.sin(midRad);

                let segmentFill = '#fafafa';
                let segmentStroke = '#e5e7eb';
                let segmentStrokeWidth = '1';
                if (isSelected) { segmentFill = '#3b82f6'; segmentStroke = '#2563eb'; segmentStrokeWidth = '2'; }
                else if (isCurrentMonth) { segmentFill = '#dbeafe'; segmentStroke = '#93c5fd'; }
                else if (monthData.count > 0) { segmentFill = '#f9fafb'; }

                let countColor = '#9ca3af';
                if (isSelected) countColor = '#ffffff';
                else if (monthData.highestPriorityStatus === 'Overdue') countColor = '#dc2626';
                else if (monthData.highestPriorityStatus === 'Pending') countColor = '#ca8a04';
                else if (monthData.highestPriorityStatus === 'Completed') countColor = '#16a34a';
                else if (isCurrentMonth) countColor = '#1e40af';

                let labelColor = '#4b5563';
                if (isSelected) labelColor = '#ffffff';
                else if (isCurrentMonth) labelColor = '#1e40af';

                return (
                  <g key={monthData.month}>
                    <path d={pathData} fill={segmentFill} stroke={segmentStroke} strokeWidth={segmentStrokeWidth} className="cursor-pointer hover:opacity-70 transition-all" onClick={() => handleMonthClick(idx)} style={{ pointerEvents: 'all' }} />
                    <g className="pointer-events-none">
                      <text x={textX} y={textY - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill={labelColor}>
                        {monthData.month.substring(0, 3).toUpperCase()}
                      </text>
                      <text x={textX} y={textY + 12} textAnchor="middle" fontSize="20" fontWeight="700" fill={countColor}>
                        {monthData.count}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Center circle */}
              <circle cx={centerX} cy={centerY} r="90" fill="#2563eb" />

              {/* Center: icon at top, year at bottom */}
              <g transform={`translate(${centerX}, ${centerY})`}>
                {/* Calendar icon - positioned in upper half of circle */}
                <rect x="-18" y="-50" width="36" height="30" rx="4" fill="none" stroke="white" strokeWidth="2" />
                <line x1="-11" y1="-50" x2="-11" y2="-44" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="0" y1="-50" x2="0" y2="-44" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="11" y1="-50" x2="11" y2="-44" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="-18" y1="-40" x2="18" y2="-40" stroke="white" strokeWidth="2" />
                {/* Year text - below icon with proper spacing */}
                <text y="22" textAnchor="middle" fontSize="28" fontWeight="800" fill="white">
                  {selectedYear}
                </text>
              </g>
            </svg>
          </div>
        )}
      </Card>

      {/* Selected Month Controls */}
      {selectedMonth !== null && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">{months[selectedMonth]} Controls</h2>
              <p className="text-sm text-slate-500 mt-1">
                {controlsByMonth[selectedMonth].count} control{controlsByMonth[selectedMonth].count !== 1 ? 's' : ''} due this month
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {controlsByMonth[selectedMonth].count > 0 ? (
            <div className="space-y-3">
              {controlsByMonth[selectedMonth].controls.map((control) => (
                <div key={control.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900">{control.title}</span>
                      <Badge variant="outline" className="text-xs">{control.category}</Badge>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{control.frequency}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500">Due: {control.next_due ?? 'N/A'}</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-500">Owner: {control.owner_name}</span>
                    </div>
                  </div>
                  <StatusBadge status={control.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No controls due in {months[selectedMonth]}</p>
            </div>
          )}
        </Card>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Upcoming Events & Deadlines</h2>

          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                    event.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                    event.status === 'Upcoming' ? 'bg-blue-100 text-blue-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    <span className="text-xs font-medium">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-lg font-semibold">
                      {new Date(event.date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{event.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500">{event.owner_name}</span>
                      <Badge variant="outline" className="text-xs">{event.type}</Badge>
                    </div>
                  </div>
                </div>
                <StatusBadge status={event.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legend */}
      <Card className="p-5 bg-slate-50">
        <h3 className="text-sm font-medium text-slate-900 mb-3">Calendar Features</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded mt-0.5"></div>
            <div>
              <p className="text-sm font-medium text-slate-900">Current Month</p>
              <p className="text-xs text-slate-500">Active control period</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">Automated Reminders</p>
              <p className="text-xs text-slate-500">Email notifications before deadlines</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-red-100 rounded mt-0.5"></div>
            <div>
              <p className="text-sm font-medium text-slate-900">Overdue Items</p>
              <p className="text-xs text-slate-500">Require immediate attention</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900">Year Navigation</p>
              <p className="text-xs text-slate-500">Use arrows to navigate between years</p>
            </div>
          </div>
        </div>
      </Card>

      <ReminderDialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen} />
      </div>
    </div>
  );
}
