import { Badge } from './ui/badge';

interface StatusBadgeProps {
  status: 'Completed' | 'Pending' | 'Overdue' | 'Active' | 'Mitigated' | 'Monitoring' | 'Upcoming';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    Completed: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Completed' },
    Pending: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending' },
    Overdue: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Overdue' },
    Active: { className: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Active' },
    Mitigated: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Mitigated' },
    Monitoring: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Monitoring' },
    Upcoming: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Upcoming' }
  };

  const variant = variants[status];

  return (
    <Badge variant="outline" className={`${variant.className} border`}>
      {variant.label}
    </Badge>
  );
}
