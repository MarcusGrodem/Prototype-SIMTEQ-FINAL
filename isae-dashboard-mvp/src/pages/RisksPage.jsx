import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';

export default function RisksPage({ risks }) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Risks</p>
          <h2>Risk register</h2>
          <p>A simplified list of the main risks that the MVP tracks.</p>
        </div>
      </header>

      <SectionCard title="Open risks">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Risk</th>
                <th>Severity</th>
                <th>Likelihood</th>
                <th>Responsible person</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.id}>
                  <td>
                    <strong>{risk.id}</strong>
                    <span>{risk.title}</span>
                  </td>
                  <td><StatusBadge value={risk.severity} /></td>
                  <td><StatusBadge value={risk.likelihood} /></td>
                  <td>{risk.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
