import MetricCard from '../components/MetricCard';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';

export default function DashboardPage({ risks, controls, evidence }) {
  const completedControls = controls.filter((item) => item.status === 'Completed').length;
  const pendingControls = controls.filter((item) => item.status === 'Pending').length;
  const overdueControls = controls.filter((item) => item.status === 'Overdue').length;
  const missingDocumentation = evidence.filter((item) => item.status === 'Missing').length;

  const issues = [
    ...controls
      .filter((item) => item.status === 'Overdue')
      .map((item) => ({
        id: item.id,
        title: item.title,
        detail: `Control owned by ${item.owner} is overdue.`
      })),
    ...evidence
      .filter((item) => item.status === 'Missing')
      .map((item) => ({
        id: item.id,
        title: item.name,
        detail: `Evidence is still missing for control ${item.controlId}.`
      }))
  ].slice(0, 5);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Compliance overview</h2>
          <p>Track the minimum set of signals an executive team needs for a quick status check.</p>
        </div>
      </header>

      <div className="metric-grid">
        <MetricCard label="Total controls" value={controls.length} helper="Core control inventory" tone="neutral" />
        <MetricCard label="Completed" value={completedControls} helper="Green items delivered" tone="success" />
        <MetricCard label="Pending / Overdue" value={`${pendingControls} / ${overdueControls}`} helper="Yellow and red items" tone="warning" />
        <MetricCard label="Risks" value={risks.length} helper="Tracked business risks" tone="neutral" />
        <MetricCard label="Missing documentation" value={missingDocumentation} helper="Evidence gaps to close" tone="danger" />
      </div>

      <div className="content-grid two-columns">
        <SectionCard title="Current issues">
          <ul className="issue-list">
            {issues.map((issue) => (
              <li key={issue.id}>
                <strong>{issue.title}</strong>
                <span>{issue.detail}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Control status snapshot">
          <div className="status-summary">
            <div className="status-row">
              <span>Completed</span>
              <StatusBadge value="Completed" />
              <strong>{completedControls}</strong>
            </div>
            <div className="status-row">
              <span>Pending</span>
              <StatusBadge value="Pending" />
              <strong>{pendingControls}</strong>
            </div>
            <div className="status-row">
              <span>Overdue</span>
              <StatusBadge value="Overdue" />
              <strong>{overdueControls}</strong>
            </div>
            <div className="status-row">
              <span>Missing evidence</span>
              <StatusBadge value="Missing" />
              <strong>{missingDocumentation}</strong>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
