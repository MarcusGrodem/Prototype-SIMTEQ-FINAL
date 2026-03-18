export const initialRisks = [
  {
    id: 'R-101',
    title: 'Payroll changes are reviewed too late',
    severity: 'High',
    likelihood: 'Medium',
    owner: 'Sarah Jensen'
  },
  {
    id: 'R-102',
    title: 'User access is not removed on time',
    severity: 'High',
    likelihood: 'High',
    owner: 'Mikkel Larsen'
  },
  {
    id: 'R-103',
    title: 'Vendor invoices are approved without full evidence',
    severity: 'Medium',
    likelihood: 'Medium',
    owner: 'Emma Berg'
  },
  {
    id: 'R-104',
    title: 'Backup testing is not documented consistently',
    severity: 'Medium',
    likelihood: 'Low',
    owner: 'Jonas Dahl'
  }
];

export const initialControls = [
  {
    id: 'C-201',
    title: 'Monthly payroll reconciliation',
    status: 'Completed',
    owner: 'Sarah Jensen',
    lastExecution: '2026-03-11',
    riskId: 'R-101'
  },
  {
    id: 'C-202',
    title: 'Quarterly user access review',
    status: 'Pending',
    owner: 'Mikkel Larsen',
    lastExecution: '2025-12-18',
    riskId: 'R-102'
  },
  {
    id: 'C-203',
    title: 'Invoice approval checklist',
    status: 'Overdue',
    owner: 'Emma Berg',
    lastExecution: '2025-11-29',
    riskId: 'R-103'
  },
  {
    id: 'C-204',
    title: 'Backup restore test',
    status: 'Pending',
    owner: 'Jonas Dahl',
    lastExecution: '2026-01-09',
    riskId: 'R-104'
  }
];

export const initialEvidence = [
  {
    id: 'E-301',
    name: 'Payroll reconciliation March.pdf',
    controlId: 'C-201',
    status: 'Uploaded',
    uploadedAt: '2026-03-12'
  },
  {
    id: 'E-302',
    name: 'Access review sign-off.docx',
    controlId: 'C-202',
    status: 'Missing',
    uploadedAt: null
  },
  {
    id: 'E-303',
    name: 'Invoice checklist Q1.xlsx',
    controlId: 'C-203',
    status: 'Missing',
    uploadedAt: null
  },
  {
    id: 'E-304',
    name: 'Backup restore test result.pdf',
    controlId: 'C-204',
    status: 'Uploaded',
    uploadedAt: '2026-02-02'
  }
];
