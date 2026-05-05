import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { alerts, controls, risks } from '../data/mockData';
import { format } from 'date-fns';

const LAST_VISIT_KEY = 'lastVisitTime';
const DAY_IN_MS = 1000 * 60 * 60 * 24;
const DUE_SOON_WINDOW_DAYS = 30;

type CatchUpTier = 'critical' | 'dueSoon' | 'informational';
type CatchUpTone = 'critical' | 'warning' | 'info' | 'neutral';

type CatchUpItem = {
  id: string;
  tier: CatchUpTier;
  title: string;
  meta: string;
  overdue: boolean;
  sortDate: number;
  tone: CatchUpTone;
};

const tierOrder: CatchUpTier[] = ['critical', 'dueSoon', 'informational'];

const tierMeta: Record<CatchUpTier, { label: string; icon: typeof AlertCircle; tone: string }> = {
  critical: {
    label: 'Critical',
    icon: AlertCircle,
    tone: 'text-red-700 bg-red-50 border-red-200'
  },
  dueSoon: {
    label: 'Due Soon',
    icon: Clock,
    tone: 'text-amber-700 bg-amber-50 border-amber-200'
  },
  informational: {
    label: 'Informational',
    icon: Info,
    tone: 'text-slate-600 bg-slate-50 border-slate-200'
  }
};

const itemTone: Record<CatchUpTone, string> = {
  critical: 'bg-red-600',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
  neutral: 'bg-slate-400'
};

function getDaysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - new Date().getTime()) / DAY_IN_MS);
}

function formatDueMeta(daysUntil: number, dueDate: string) {
  const formattedDate = format(new Date(dueDate), 'MMM d');

  if (daysUntil < 0) {
    return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} overdue • Due ${formattedDate}`;
  }

  if (daysUntil === 0) {
    return `Due today • ${formattedDate}`;
  }

  return `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'} • ${formattedDate}`;
}

function sortCatchUpItems(a: CatchUpItem, b: CatchUpItem) {
  if (a.overdue !== b.overdue) {
    return a.overdue ? -1 : 1;
  }

  return a.sortDate - b.sortDate;
}

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
    const recentControls = controls.filter(c => {
      const status = c.status.toLowerCase();
      return status === 'pending' || status === 'overdue';
    }).slice(0, 3);
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

  const getCatchUpItems = () => {
    const alertItems: CatchUpItem[] = alerts.map(alert => {
      const relatedControl = alert.relatedTo ? controls.find(control => control.id === alert.relatedTo) : undefined;
      const relatedDaysUntil = relatedControl?.nextDue ? getDaysUntil(relatedControl.nextDue) : null;
      const relatedControlIsOverdue = relatedControl
        ? relatedControl.status.toLowerCase() === 'overdue' || (relatedDaysUntil !== null && relatedDaysUntil < 0)
        : false;
      const alertDate = alert.date ? new Date(alert.date).getTime() : Number.MAX_SAFE_INTEGER;
      const sortDate = relatedControl?.nextDue ? new Date(relatedControl.nextDue).getTime() : alertDate;
      const loggedMeta = alert.date ? format(new Date(alert.date), 'MMM d') : null;
      const alertMeta = relatedControlIsOverdue && relatedControl?.nextDue && relatedDaysUntil !== null
        ? formatDueMeta(relatedDaysUntil, relatedControl.nextDue)
        : null;

      if (alert.type === 'error') {
        return {
          id: `alert-${alert.id}`,
          tier: 'critical',
          title: alert.message,
          meta: alertMeta ?? (loggedMeta ? `Alert logged ${loggedMeta}` : 'Alert logged'),
          overdue: relatedControlIsOverdue,
          sortDate,
          tone: 'critical'
        };
      }

      if (alert.type === 'warning') {
        return {
          id: `alert-${alert.id}`,
          tier: relatedControlIsOverdue ? 'critical' : 'dueSoon',
          title: alert.message,
          meta: alertMeta ?? (loggedMeta ? `Warning logged ${loggedMeta}` : 'Warning logged'),
          overdue: relatedControlIsOverdue,
          sortDate,
          tone: 'warning'
        };
      }

      return {
        id: `alert-${alert.id}`,
        tier: 'informational',
        title: alert.message,
        meta: alert.date ? `Notice logged ${format(new Date(alert.date), 'MMM d')}` : 'Notice logged',
        overdue: false,
        sortDate: alertDate,
        tone: 'info'
      };
    });

    const controlItems: CatchUpItem[] = controls
      .filter(control => {
        if (!control.nextDue) {
          return control.status.toLowerCase() !== 'completed';
        }

        const daysUntil = getDaysUntil(control.nextDue);
        const status = control.status.toLowerCase();

        return status === 'overdue' || status === 'pending' || daysUntil <= DUE_SOON_WINDOW_DAYS;
      })
      .map(control => {
        const status = control.status.toLowerCase();
        const daysUntil = control.nextDue ? getDaysUntil(control.nextDue) : Number.MAX_SAFE_INTEGER;
        const overdue = status === 'overdue' || daysUntil < 0;
        const sortDate = control.nextDue ? new Date(control.nextDue).getTime() : Number.MAX_SAFE_INTEGER;

        return {
          id: `control-${control.id}`,
          tier: overdue ? 'critical' : 'dueSoon',
          title: control.title,
          meta: control.nextDue
            ? `${formatDueMeta(daysUntil, control.nextDue)} • ${control.category}`
            : `${control.status} • ${control.category}`,
          overdue,
          sortDate,
          tone: overdue ? 'critical' : 'warning'
        };
      })
      .sort(sortCatchUpItems)
      .slice(0, 6);

    const riskItems: CatchUpItem[] = risks
      .filter(risk => risk.riskScore >= 7)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 2)
      .map(risk => ({
        id: `risk-${risk.id}`,
        tier: 'critical',
        title: risk.title,
        meta: `Risk score ${risk.riskScore} • ${risk.category}`,
        overdue: false,
        sortDate: Number.MAX_SAFE_INTEGER - risk.riskScore,
        tone: 'critical'
      }));

    return [...controlItems, ...alertItems, ...riskItems].reduce<Record<CatchUpTier, CatchUpItem[]>>(
      (sections, item) => {
        sections[item.tier].push(item);
        return sections;
      },
      { critical: [], dueSoon: [], informational: [] }
    );
  };

  const updatesByTier = getCatchUpItems();
  tierOrder.forEach(tier => {
    updatesByTier[tier].sort(sortCatchUpItems);
  });

  const totalItems = tierOrder.reduce((count, tier) => count + updatesByTier[tier].length, 0);

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
          className="w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 max-h-[500px] overflow-hidden"
          align="end"
          sideOffset={8}
        >
          <div className="p-4 border-b bg-slate-50">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900">What's New</h3>
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
            <p className="text-xs text-slate-500">
              {lastVisit 
                ? `Updates since ${format(lastVisit, 'MMM d, h:mm a')}`
                : 'Recent activity and updates'
              }
            </p>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <div className="divide-y divide-slate-200">
              {tierOrder.map(tier => {
                const section = tierMeta[tier];
                const SectionIcon = section.icon;
                const sectionItems = updatesByTier[tier];

                if (sectionItems.length === 0) {
                  return null;
                }

                return (
                  <section key={tier} className="py-3 first:pt-2">
                    <div className="flex items-center justify-between px-4 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 items-center justify-center rounded border ${section.tone}`}>
                          <SectionIcon className="h-3.5 w-3.5" />
                        </span>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                          {section.label}
                        </h4>
                      </div>
                      <Badge variant="outline" className="h-5 min-w-5 justify-center border-slate-200 px-1.5 text-[10px] text-slate-600">
                        {sectionItems.length}
                      </Badge>
                    </div>

                    <div className="px-2">
                      {sectionItems.map(item => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[auto_1fr] gap-2 rounded-md px-2 py-2 text-xs hover:bg-slate-50"
                        >
                          <span className={`mt-1 h-2 w-2 rounded-full ${itemTone[item.tone]}`} />
                          <div className="min-w-0">
                            <div className="flex items-start gap-2">
                              <p className="min-w-0 flex-1 font-medium leading-snug text-slate-900 line-clamp-2">
                                {item.title}
                              </p>
                              {item.overdue && (
                                <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[10px] leading-tight text-slate-500">
                              {item.meta}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}

              {totalItems === 0 && (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-slate-900">All caught up!</p>
                  <p className="text-xs text-slate-500 mt-1">No new updates to show</p>
                </div>
              )}
            </div>
          </div>

          {totalItems > 0 && (
            <div className="p-3 border-t bg-slate-50">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
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
