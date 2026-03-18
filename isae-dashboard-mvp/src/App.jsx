import { useMemo, useState } from 'react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import RisksPage from './pages/RisksPage';
import ControlsPage from './pages/ControlsPage';
import EvidencePage from './pages/EvidencePage';
import { initialControls, initialEvidence, initialRisks } from './data/mockData';

const today = '2026-03-18';

export default function App() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [controls, setControls] = useState(initialControls);
  const [evidence, setEvidence] = useState(initialEvidence);

  const risks = useMemo(() => initialRisks, []);

  const handleCompleteControl = (controlId) => {
    setControls((current) =>
      current.map((control) =>
        control.id === controlId
          ? { ...control, status: 'Completed', lastExecution: today }
          : control
      )
    );
  };

  const handleUploadEvidence = (evidenceId) => {
    setEvidence((current) =>
      current.map((item) =>
        item.id === evidenceId
          ? { ...item, status: 'Uploaded', uploadedAt: today }
          : item
      )
    );
  };

  const pageMap = {
    Dashboard: <DashboardPage risks={risks} controls={controls} evidence={evidence} />,
    Risks: <RisksPage risks={risks} />,
    Controls: <ControlsPage controls={controls} onComplete={handleCompleteControl} />,
    Evidence: <EvidencePage evidence={evidence} controls={controls} onUpload={handleUploadEvidence} />
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {pageMap[activePage]}
    </Layout>
  );
}
