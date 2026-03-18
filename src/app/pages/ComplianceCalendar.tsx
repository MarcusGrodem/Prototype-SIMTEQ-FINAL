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
import { complianceEvents, controls } from '../data/mockData';
import { useState, useCallback } from 'react';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function ComplianceCalendar() {
  const currentMonth = 2; // March (0-indexed)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);

  // Handle month click
  const handleMonthClick = useCallback((idx: number) => {
    setSelectedMonth(prev => idx === prev ? null : idx);
  }, []);

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedMonth(null);
  }, []);

  // Handle reminder button click
  const handleReminderClick = useCallback(() => {
    setReminderDialogOpen(true);
  }, []);

  // Group controls by month
  const controlsByMonth = months.map((month, idx) => {
    const monthControls = controls.filter(control => {
      const nextDueMonth = new Date(control.nextDue).getMonth();
      return nextDueMonth === idx;
    });
    
    // Determine highest priority status for the month
    let highestPriorityStatus: 'Overdue' | 'Pending' | 'Completed' | null = null;
    if (monthControls.some(c => c.status === 'Overdue')) {
      highestPriorityStatus = 'Overdue';
    } else if (monthControls.some(c => c.status === 'Pending')) {
      highestPriorityStatus = 'Pending';
    } else if (monthControls.length > 0) {
      highestPriorityStatus = 'Completed';
    }
    
    return { 
      month, 
      controls: monthControls, 
      count: monthControls.length,
      highestPriorityStatus 
    };
  });

  // Upcoming events
  const upcomingEvents = complianceEvents.slice(0, 8);

  // Calculate positions for months in a circle
  const centerX = 300;
  const centerY = 300;
  const radius = 175; // Position for text labels
  
  const monthPositions = months.map((month, idx) => {
    const angle = (idx * 30 - 90) * (Math.PI / 180); // Start from top, 30 degrees per month
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { month, x, y, angle: idx * 30, ...controlsByMonth[idx] };
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Compliance Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Track control deadlines and audit schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReminderClick}>
            <Bell className="w-4 h-4 mr-2" />
            Set Reminders
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {controlsByMonth[currentMonth].count}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Upcoming</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">
            {complianceEvents.filter(e => e.status === 'Upcoming').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-semibold text-red-600 mt-1">
            {complianceEvents.filter(e => e.status === 'Overdue').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            {complianceEvents.filter(e => e.status === 'Completed').length}
          </p>
        </Card>
      </div>

      {/* Year Wheel */}
      <Card className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">2026 Control Schedule</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              2026
            </Button>
            <Button variant="outline" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Circular year wheel */}
        <div className="flex justify-center">
          <svg width="600" height="600" viewBox="0 0 600 600" className="max-w-full">
            {/* Outer circle rings */}
            <circle cx={centerX} cy={centerY} r="250" fill="none" stroke="#e5e7eb" strokeWidth="1" />
            <circle cx={centerX} cy={centerY} r="220" fill="none" stroke="#e5e7eb" strokeWidth="1" />
            <circle cx={centerX} cy={centerY} r="190" fill="none" stroke="#e5e7eb" strokeWidth="1" />
            
            {/* Month segments */}
            {monthPositions.map((monthData, idx) => {
              const isCurrentMonth = idx === currentMonth;
              const isSelected = idx === selectedMonth;
              const startAngle = idx * 30 - 90;
              const endAngle = (idx + 1) * 30 - 90;
              const innerRadius = 100;
              const outerRadius = 250;
              
              // Calculate arc path
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
              
              const pathData = `
                M ${x1} ${y1}
                L ${x2} ${y2}
                A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3}
                L ${x4} ${y4}
                A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}
              `;
              
              // Calculate midpoint for text positioning
              const midAngle = (startAngle + endAngle) / 2;
              const midRad = midAngle * (Math.PI / 180);
              const textRadius = 175;
              const textX = centerX + textRadius * Math.cos(midRad);
              const textY = centerY + textRadius * Math.sin(midRad);
              
              // Determine segment fill and stroke colors
              let segmentFill = '#fafafa'; // default light gray
              let segmentStroke = '#e5e7eb'; // default border
              let segmentStrokeWidth = '1';
              
              if (isSelected) {
                segmentFill = '#3b82f6'; // bright blue for selected
                segmentStroke = '#2563eb';
                segmentStrokeWidth = '2';
              } else if (isCurrentMonth) {
                segmentFill = '#dbeafe'; // light blue for current month
                segmentStroke = '#93c5fd';
              } else if (monthData.count > 0) {
                segmentFill = '#f9fafb'; // very light gray for months with controls
              }
              
              // Determine color for the count based on highest priority status
              let countColor = '#9ca3af'; // gray for no controls
              if (isSelected) {
                countColor = '#ffffff'; // white for selected
              } else if (monthData.highestPriorityStatus === 'Overdue') {
                countColor = '#dc2626'; // red for overdue
              } else if (monthData.highestPriorityStatus === 'Pending') {
                countColor = '#ca8a04'; // yellow for pending
              } else if (monthData.highestPriorityStatus === 'Completed') {
                countColor = '#16a34a'; // green for completed
              } else if (isCurrentMonth) {
                countColor = '#1e40af'; // dark blue for current month with no specific status
              }
              
              // Label color
              let labelColor = '#4b5563'; // default gray
              if (isSelected) {
                labelColor = '#ffffff'; // white for selected
              } else if (isCurrentMonth) {
                labelColor = '#1e40af'; // dark blue for current month
              }
              
              return (
                <g key={monthData.month}>
                  {/* Clickable segment fill */}
                  <path
                    d={pathData}
                    fill={segmentFill}
                    stroke={segmentStroke}
                    strokeWidth={segmentStrokeWidth}
                    className="cursor-pointer hover:opacity-70 transition-all"
                    onClick={handleMonthClick.bind(null, idx)}
                    style={{ pointerEvents: 'all' }}
                  />
                  
                  {/* Month label and count - centered in segment */}
                  <g className="pointer-events-none">
                    <text
                      x={textX}
                      y={textY - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill={labelColor}
                    >
                      {monthData.month.substring(0, 3).toUpperCase()}
                    </text>
                    
                    <text
                      x={textX}
                      y={textY + 12}
                      textAnchor="middle"
                      fontSize="20"
                      fontWeight="700"
                      fill={countColor}
                    >
                      {monthData.count}
                    </text>
                  </g>
                </g>
              );
            })}
            
            {/* Center circle */}
            <circle cx={centerX} cy={centerY} r="90" fill="#2563eb" />
            
            {/* Center icon and text */}
            <g transform={`translate(${centerX}, ${centerY})`}>
              {/* Calendar icon - moved up to avoid overlap */}
              <rect x="-20" y="-40" width="40" height="35" rx="4" fill="none" stroke="white" strokeWidth="2.5" />
              <line x1="-13" y1="-40" x2="-13" y2="-33" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="0" y1="-40" x2="0" y2="-33" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="13" y1="-40" x2="13" y2="-33" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="-20" y1="-28" x2="20" y2="-28" stroke="white" strokeWidth="2.5" />
              
              {/* Year - properly centered below icon */}
              <text
                y="20"
                textAnchor="middle"
                fontSize="32"
                fontWeight="800"
                fill="white"
              >
                2026
              </text>
            </g>
          </svg>
        </div>
      </Card>

      {/* Selected Month Controls */}
      {selectedMonth !== null && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">{months[selectedMonth]} Controls</h2>
              <p className="text-sm text-gray-500 mt-1">
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
                <div 
                  key={control.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">{control.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {control.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {control.frequency}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">Due: {control.nextDue}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">Owner: {control.owner}</span>
                    </div>
                  </div>
                  <StatusBadge status={control.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No controls due in {months[selectedMonth]}</p>
            </div>
          )}
        </Card>
      )}

      {/* Upcoming Events */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Upcoming Events & Deadlines</h2>
        
        <div className="space-y-3">
          {upcomingEvents.map((event) => (
            <div 
              key={event.id} 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${
                  event.status === 'Overdue' 
                    ? 'bg-red-100 text-red-700'
                    : event.status === 'Upcoming'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  <span className="text-xs font-medium">
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </span>
                  <span className="text-lg font-semibold">
                    {new Date(event.date).getDate()}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{event.owner}</span>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                </div>
              </div>

              <StatusBadge status={event.status} />
            </div>
          ))}
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-5 bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Calendar Features</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded mt-0.5"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Current Month</p>
              <p className="text-xs text-gray-500">Active control period</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Automated Reminders</p>
              <p className="text-xs text-gray-500">Email notifications before deadlines</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-red-100 rounded mt-0.5"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Overdue Items</p>
              <p className="text-xs text-gray-500">Require immediate attention</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Frequency-based</p>
              <p className="text-xs text-gray-500">Controls scheduled by frequency</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Reminder Dialog */}
      <ReminderDialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen} />
    </div>
  );
}