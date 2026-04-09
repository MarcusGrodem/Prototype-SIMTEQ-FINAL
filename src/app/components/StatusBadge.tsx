import { Badge } from './ui/badge';

interface StatusBadgeProps {
  status: 'Completed' | 'Pending' | 'Overdue' | 'Active' | 'Mitigated' | 'Monitoring' | 'Upcoming';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<string, string> = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Pending:   'bg-amber-50 text-amber-700 border-amber-200',
    Overdue:   'bg-red-50 text-red-700 border-red-200',
    Active:    'bg-sky-50 text-sky-700 border-sky-200',
    Mitigated: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Monitoring:'bg-slate-100 text-slate-600 border-slate-200',
    Upcoming:  'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <Badge variant="outline" className={`text-xs font-medium border ${variants[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {status}
    </Badge>
  );
}
