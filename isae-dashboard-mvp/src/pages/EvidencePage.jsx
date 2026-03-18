import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';

export default function EvidencePage({ evidence, controls, onUpload }) {
  return (
    <div className="page-stack">
      <header className="page-header split-header">
        <div>
          <p className="eyebrow">Evidence</p>
          <h2>Documentation</h2>
          <p>Mock document tracking for supporting control execution.</p>
        </div>
        <button type="button" className="primary-button">Upload document</button>
      </header>

      <SectionCard title="Evidence library">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Linked control</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => {
                const linkedControl = controls.find((control) => control.id === item.controlId);

                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.id}</strong>
                      <span>{item.name}</span>
                    </td>
                    <td>{linkedControl ? `${linkedControl.id} — ${linkedControl.title}` : item.controlId}</td>
                    <td><StatusBadge value={item.status} /></td>
                    <td>{item.uploadedAt || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={item.status === 'Uploaded'}
                        onClick={() => onUpload(item.id)}
                      >
                        {item.status === 'Uploaded' ? 'Uploaded' : 'Mock upload'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
