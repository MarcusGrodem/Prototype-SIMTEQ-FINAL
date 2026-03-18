import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, Clock, TrendingUp, Info } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { alerts, controls, risks } from '../data/mockData';
import { format } from 'date-fns';

const LAST_VISIT_KEY = 'lastVisitTime';

export function CatchUpNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastVisit, setLastVisit] = useState<Date | null>(null);
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    // Get last visit time from localStorage
    const stored = localStorage.getItem(LAST_VISIT_KEY);
    if (stored) {
      setLastVisit(new Date(stored));
    }

    // Update last visit time when component unmounts
    return () => {
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    };
  }, []);

  useEffect(() => {
    if (!lastVisit) {
      setHasNewUpdates(false);
      setUpdateCount(0);
      return;
    }

    // Calculate new updates since last visit
    let count = 0;

    // Count new alerts
    const newAlerts = alerts.filter(a => {
      const alertDate = new Date();
      alertDate.setHours(alertDate.getHours() - 2); // Simulate some alerts are 2 hours old
      return alertDate > lastVisit;
    });
    count += newAlerts.length;

    // Count recently updated controls (simulate some were updated)
    const recentControls = controls.filter(c => c.status === 'pending' || c.status === 'overdue').slice(0, 3);
    count += recentControls.length;

    setUpdateCount(count);
    setHasNewUpdates(count > 0);
  }, [lastVisit]);

  const handleMarkAsRead = () => {
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    setHasNewUpdates(false);
    setUpdateCount(0);
    setIsOpen(false);
  };

  // Get recent updates data
  const getRecentUpdates = () => {
    const now = new Date();
    
    return {
      alerts: alerts
        .filter(a => a.type === 'error' || a.type === 'warning')
        .slice(0, 3)
        .map(a => ({
          ...a,
          time: 'Just now'
        })),
      controls: controls
        .filter(c => c.status === 'pending' || c.status === 'overdue')
        .slice(0, 3)
        .map(c => ({
          ...c,
          time: c.status === 'overdue' ? 'Overdue' : 'Pending'
        })),
      upcomingDeadlines: controls
        .filter(c => c.nextDue)
        .sort((a, b) => new Date(a.nextDue!).getTime() - new Date(b.nextDue!).getTime())
        .slice(0, 3)
        .map(c => ({
          ...c,
          daysUntil: Math.ceil((new Date(c.nextDue!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        })),
      risks: risks
        .filter(r => r.severity === 'high' || r.severity === 'critical')
        .slice(0, 2)
    };
  };

  const updates = getRecentUpdates();
  const totalItems = updates.alerts.length + updates.controls.length + updates.upcomingDeadlines.length + updates.risks.length;

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="relative gap-2"
        >
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline">Catch Up</span>
          {hasNewUpdates && updateCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-2 border-white pointer-events-none"
            >
              {updateCount > 9 ? '9+' : updateCount}
            </Badge>
          )}
        </Button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          className="w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[500px] overflow-hidden"
          align="end"
          sideOffset={8}
        >
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">What's New</h3>
              {hasNewUpdates && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAsRead}
                  className="h-6 text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark as read
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-600">
              {lastVisit 
                ? `Updates since ${format(lastVisit, 'MMM d, h:mm a')}`
                : 'Recent activity and updates'
              }
            </p>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* Critical Alerts */}
              {updates.alerts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <h4 className="text-xs font-semibold text-gray-900">Critical Alerts</h4>
                    <Badge variant="destructive" className="h-4 text-xs px-1.5">
                      {updates.alerts.length}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {updates.alerts.map(alert => (
                      <div 
                        key={alert.id}
                        className="p-2 bg-red-50 border border-red-100 rounded text-xs"
                      >
                        <p className="text-red-900 font-medium">{alert.message}</p>
                        <p className="text-red-600 text-[10px] mt-0.5">{alert.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Required */}
              {updates.controls.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <h4 className="text-xs font-semibold text-gray-900">Action Required</h4>
                    <Badge className="h-4 text-xs px-1.5 bg-orange-500">
                      {updates.controls.length}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {updates.controls.map(control => (
                      <div 
                        key={control.id}
                        className="p-2 bg-orange-50 border border-orange-100 rounded text-xs"
                      >
                        <p className="text-gray-900 font-medium line-clamp-1">{control.name}</p>
                        <p className="text-orange-600 text-[10px] mt-0.5">
                          {control.time} • {control.category}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Deadlines */}
              {updates.upcomingDeadlines.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    <h4 className="text-xs font-semibold text-gray-900">Upcoming Deadlines</h4>
                  </div>
                  <div className="space-y-1.5">
                    {updates.upcomingDeadlines.map(control => (
                      <div 
                        key={control.id}
                        className="p-2 bg-blue-50 border border-blue-100 rounded text-xs"
                      >
                        <p className="text-gray-900 font-medium line-clamp-1">{control.name}</p>
                        <p className="text-blue-600 text-[10px] mt-0.5">
                          {control.daysUntil > 0 
                            ? `In ${control.daysUntil} day${control.daysUntil > 1 ? 's' : ''}`
                            : 'Today'
                          } • {control.nextDue && format(new Date(control.nextDue), 'MMM d')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High Priority Risks */}
              {updates.risks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
                    <h4 className="text-xs font-semibold text-gray-900">High Priority Risks</h4>
                  </div>
                  <div className="space-y-1.5">
                    {updates.risks.map(risk => (
                      <div 
                        key={risk.id}
                        className="p-2 bg-purple-50 border border-purple-100 rounded text-xs"
                      >
                        <p className="text-gray-900 font-medium line-clamp-1">{risk.name}</p>
                        <p className="text-purple-600 text-[10px] mt-0.5 capitalize">
                          {risk.severity} Risk • {risk.category}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {totalItems === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-gray-900">All caught up!</p>
                  <p className="text-xs text-gray-500 mt-1">No new updates to show</p>
                </div>
              )}
            </div>
          </div>

          {totalItems > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                <Info className="w-3 h-3" />
                <span>{totalItems} item{totalItems > 1 ? 's' : ''} need your attention</span>
              </div>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
