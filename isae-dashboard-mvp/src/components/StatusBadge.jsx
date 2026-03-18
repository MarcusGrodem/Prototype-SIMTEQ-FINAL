const toneMap = {
  Completed: 'success',
  Uploaded: 'success',
  Pending: 'warning',
  Missing: 'danger',
  Overdue: 'danger',
  High: 'danger',
  Medium: 'warning',
  Low: 'success'
};

export default function StatusBadge({ children, value }) {
  const tone = toneMap[value || children] || 'neutral';

  return <span className={`badge badge-${tone}`}>{children || value}</span>;
}
