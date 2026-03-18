import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';

export default function ControlsPage({ controls, onComplete }) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Controls</p>
          <h2>Control register</h2>
          <p>Follow control status, owners, and latest execution in one simple view.</p>
        </div>
      </header>

      <SectionCard title="Key controls">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Control</th>
                <th>Status</th>
                <th>Responsible person</th>
                <th>Last execution</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {controls.map((control) => (
                <tr key={control.id}>
                  <td>
                    <strong>{control.id}</strong>
                    <span>{control.title}</span>
                  </td>
                  <td><StatusBadge value={control.status} /></td>
                  <td>{control.owner}</td>
                  <td>{control.lastExecution}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={control.status === 'Completed'}
                      onClick={() => onComplete(control.id)}
                    >
                      {control.status === 'Completed' ? 'Done' : 'Mark as completed'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
