export default function MetricCard({ label, value, helper, tone = 'neutral' }) {
  return (
    <section className={`card metric-card metric-${tone}`}>
      <p className="card-label">{label}</p>
      <strong className="metric-value">{value}</strong>
      <p className="card-helper">{helper}</p>
    </section>
  );
}
