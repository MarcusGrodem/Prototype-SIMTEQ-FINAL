// Mock data for the Risk & Control Dashboard
// Based on Simteq ISO 27001:2022 Statement of Applicability

export interface Risk {
  id: string;
  title: string;
  category: string;
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  riskScore: number;
  owner: string;
  status: 'Active' | 'Mitigated' | 'Monitoring';
  relatedControls: string[];
  lastReview: string;
}

export interface Control {
  id: string;
  title: string;
  category: string;
  frequency: 'Monthly' | 'Quarterly' | 'Yearly';
  owner: string;
  status: 'Completed' | 'Pending' | 'Overdue';
  lastExecution: string;
  nextDue: string;
  evidence: string[];
  description: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadedBy: string;
  uploadDate: string;
  version: string;
  linkedTo: { type: 'risk' | 'control'; id: string }[];
  size: string;
}

export interface ComplianceEvent {
  id: string;
  title: string;
  type: 'control' | 'audit' | 'review';
  date: string;
  owner: string;
  status: 'Completed' | 'Upcoming' | 'Overdue';
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  date: string;
  relatedTo?: string;
}

export const risks: Risk[] = [
  {
    id: 'R001',
    title: 'Utilstrekkelige informasjonssikkerhetspolitikker',
    category: 'Ledelse',
    likelihood: 'Medium',
    impact: 'High',
    riskScore: 7,
    owner: 'Lars Hansen',
    status: 'Active',
    relatedControls: ['C001', 'C002'],
    lastReview: '2026-03-01'
  },
  {
    id: 'R002',
    title: 'Uautorisert tilgang til sensitive data',
    category: 'Sikkerhet',
    likelihood: 'High',
    impact: 'High',
    riskScore: 9,
    owner: 'Anna Johansen',
    status: 'Active',
    relatedControls: ['C007', 'C008', 'C009', 'C010'],
    lastReview: '2026-03-05'
  },
  {
    id: 'R003',
    title: 'Leverandørrelaterte sikkerhetssårbarheter',
    category: 'Leverandørstyring',
    likelihood: 'Medium',
    impact: 'High',
    riskScore: 7,
    owner: 'Kari Olsen',
    status: 'Monitoring',
    relatedControls: ['C011', 'C012', 'C013', 'C014', 'C015'],
    lastReview: '2026-02-28'
  },
  {
    id: 'R004',
    title: 'Utilstrekkelig hendelseshåndtering',
    category: 'Sikkerhetshendelser',
    likelihood: 'Medium',
    impact: 'High',
    riskScore: 7,
    owner: 'Erik Andersen',
    status: 'Active',
    relatedControls: ['C016', 'C017', 'C018', 'C019', 'C020'],
    lastReview: '2026-03-10'
  },
  {
    id: 'R005',
    title: 'Manglende business continuity ved driftsforstyrrelse',
    category: 'Kontinuitet',
    likelihood: 'Low',
    impact: 'High',
    riskScore: 5,
    owner: 'Per Nilsen',
    status: 'Mitigated',
    relatedControls: ['C021', 'C022'],
    lastReview: '2026-02-20'
  },
  {
    id: 'R006',
    title: 'Brudd på dokumentbeskyttelse og oppbevaring',
    category: 'Etterlevelse',
    likelihood: 'Low',
    impact: 'Medium',
    riskScore: 3,
    owner: 'Sofie Berg',
    status: 'Monitoring',
    relatedControls: ['C023'],
    lastReview: '2026-03-01'
  },
  {
    id: 'R007',
    title: 'Utilstrekkelig medarbeideropplæring i sikkerhet',
    category: 'Personal',
    likelihood: 'Medium',
    impact: 'Medium',
    riskScore: 5,
    owner: 'Marte Solberg',
    status: 'Active',
    relatedControls: ['C026', 'C027'],
    lastReview: '2026-02-15'
  },
  {
    id: 'R008',
    title: 'Fysisk tilgang til sensitive områder',
    category: 'Fysisk sikkerhet',
    likelihood: 'Low',
    impact: 'Medium',
    riskScore: 3,
    owner: 'Thomas Lund',
    status: 'Monitoring',
    relatedControls: ['C028', 'C029', 'C030'],
    lastReview: '2026-02-10'
  },
  {
    id: 'R009',
    title: 'Datalekkasje gjennom lagringsmedier',
    category: 'Datasikkerhet',
    likelihood: 'Medium',
    impact: 'High',
    riskScore: 7,
    owner: 'Ingrid Haugen',
    status: 'Active',
    relatedControls: ['C031', 'C032'],
    lastReview: '2026-03-08'
  },
  {
    id: 'R010',
    title: 'Malware og virus-infeksjon',
    category: 'Teknologi',
    likelihood: 'High',
    impact: 'Medium',
    riskScore: 7,
    owner: 'Anna Johansen',
    status: 'Active',
    relatedControls: ['C035', 'C036', 'C037'],
    lastReview: '2026-03-12'
  },
  {
    id: 'R011',
    title: 'Utilstrekkelig backup og recovery',
    category: 'Kontinuitet',
    likelihood: 'Low',
    impact: 'High',
    riskScore: 5,
    owner: 'Per Nilsen',
    status: 'Mitigated',
    relatedControls: ['C038', 'C039'],
    lastReview: '2026-03-05'
  },
  {
    id: 'R012',
    title: 'Nettverkssikkerhetssårbarheter',
    category: 'Teknologi',
    likelihood: 'Medium',
    impact: 'High',
    riskScore: 7,
    owner: 'Anna Johansen',
    status: 'Active',
    relatedControls: ['C042', 'C043', 'C044', 'C045'],
    lastReview: '2026-03-11'
  },
  {
    id: 'R013',
    title: 'Usikker programvareutvikling',
    category: 'Applikasjonssikkerhet',
    likelihood: 'Medium',
    impact: 'Medium',
    riskScore: 5,
    owner: 'Erik Andersen',
    status: 'Monitoring',
    relatedControls: ['C047', 'C048', 'C049', 'C050', 'C051', 'C052', 'C053'],
    lastReview: '2026-02-28'
  }
];

export const controls: Control[] = [
  {
    id: 'C001',
    title: 'Politikker for informasjonssikkerhet (5.1)',
    category: 'Organisatoriske foranstaltninger',
    frequency: 'Yearly',
    owner: 'Lars Hansen',
    status: 'Pending',
    lastExecution: '2025-04-10',
    nextDue: '2026-04-10',
    evidence: [],
    description: 'Etablere og vedlikeholde informasjonssikkerhetspolitikker dokumentert i personalhåndbok'
  },
  {
    id: 'C002',
    title: 'Roller og ansvar for informasjonssikkerhet (5.2)',
    category: 'Organisatoriske foranstaltninger',
    frequency: 'Yearly',
    owner: 'Lars Hansen',
    status: 'Completed',
    lastExecution: '2026-02-15',
    nextDue: '2027-02-15',
    evidence: ['roller-ansvar-2026.pdf'],
    description: 'Definere og dokumentere roller og ansvar for informasjonssikkerhet'
  },
  {
    id: 'C003',
    title: 'Funksjonsadskillelse (5.3)',
    category: 'Organisatoriske foranstaltninger',
    frequency: 'Yearly',
    owner: 'Lars Hansen',
    status: 'Completed',
    lastExecution: '2026-01-20',
    nextDue: '2027-01-20',
    evidence: ['funksjonsadskillelse-dok.pdf'],
    description: 'Sikre funksjonsadskillelse for å redusere risiko for uautorisert bruk'
  },
  {
    id: 'C004',
    title: 'Ledelsens ansvar (5.4)',
    category: 'Organisatoriske foranstaltninger',
    frequency: 'Yearly',
    owner: 'Lars Hansen',
    status: 'Completed',
    lastExecution: '2026-01-15',
    nextDue: '2027-01-15',
    evidence: ['org-diagram-2026.pdf'],
    description: 'Organisasjonsdiagram med 4 siloer som viser ledelsens ansvar'
  },
  {
    id: 'C005',
    title: 'Kontakt med myndigheter (5.5)',
    category: 'Organisatoriske foranstaltninger',
    frequency: 'Yearly',
    owner: 'Sofie Berg',
    status: 'Completed',
    lastExecution: '2026-02-01',
    nextDue: '2027-02-01',
    evidence: ['myndighetskontakt-dok.pdf'],
    description: 'Opprettholde kontakt med erhvervsstyrelsen og datatilsynet'
  },
  {
    id: 'C006',
    title: 'Trusselunderretning (5.7)',
    category: 'Organisatoriske foranstaltninger',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Pending',
    lastExecution: '2025-12-10',
    nextDue: '2026-03-10',
    evidence: [],
    description: 'Etablere prosess for å motta og håndtere trusselunderretning'
  },
  {
    id: 'C007',
    title: 'Administrasjon av tilgang (5.15)',
    category: 'Tilgangskontroll',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-01',
    nextDue: '2026-06-01',
    evidence: ['ad-mfa-rapport-q1-2026.pdf'],
    description: 'AD enforced MFA for tilgangskontroll (ikke fysisk adgangskontroll)'
  },
  {
    id: 'C008',
    title: 'Styring av identifikasjon (5.16)',
    category: 'Tilgangskontroll',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-05',
    nextDue: '2026-06-05',
    evidence: ['onedrive-tilgangsstyring-q1.pdf'],
    description: 'OneDrive styring og avdelingsleder tildeler tilgang'
  },
  {
    id: 'C009',
    title: 'Autentifikationsoplysninger (5.17)',
    category: 'Tilgangskontroll',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-08',
    nextDue: '2026-06-08',
    evidence: ['azure-ad-mfa-q1.pdf'],
    description: 'Azure AD enforced MFA for sikre autentifikationsoplysninger'
  },
  {
    id: 'C010',
    title: 'Tilgangsrettigheter (5.18)',
    category: 'Tilgangskontroll',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-10',
    nextDue: '2026-06-10',
    evidence: ['lastpass-audit-q1.pdf'],
    description: 'AD enforced MFA og LastPass til alle medarbeidere'
  },
  {
    id: 'C011',
    title: 'Informasjonssikkerhet i leverandørforhold (5.19)',
    category: 'Leverandørstyring',
    frequency: 'Yearly',
    owner: 'Kari Olsen',
    status: 'Pending',
    lastExecution: '2025-09-15',
    nextDue: '2026-09-15',
    evidence: [],
    description: 'Sikre informasjonssikkerhet hos MS, SMS leverandør, Trello/Atlassian, HippoRello'
  },
  {
    id: 'C012',
    title: 'Håndtering av sikkerhet i leverandøraftaler (5.20)',
    category: 'Leverandørstyring',
    frequency: 'Yearly',
    owner: 'Kari Olsen',
    status: 'Pending',
    lastExecution: '2025-10-01',
    nextDue: '2026-10-01',
    evidence: [],
    description: 'Simteq stiller samme krav til leverandører som til seg selv'
  },
  {
    id: 'C013',
    title: 'Styring av IKT-forsyningskæden (5.21)',
    category: 'Leverandørstyring',
    frequency: 'Yearly',
    owner: 'Kari Olsen',
    status: 'Completed',
    lastExecution: '2026-01-10',
    nextDue: '2027-01-10',
    evidence: ['ikt-leverandor-oversikt.pdf'],
    description: 'Kun Microsoft og SMS leverandører i IKT-forsyningskæden'
  },
  {
    id: 'C014',
    title: 'Overvågning av leverandørydelser (5.22)',
    category: 'Leverandørstyring',
    frequency: 'Yearly',
    owner: 'Kari Olsen',
    status: 'Pending',
    lastExecution: '2025-11-20',
    nextDue: '2026-11-20',
    evidence: [],
    description: 'Simteq stiller krav og overvåker leverandørytelser'
  },
  {
    id: 'C015',
    title: 'Informasjonssikkerhet ved cloudtjenester (5.23)',
    category: 'Leverandørstyring',
    frequency: 'Yearly',
    owner: 'Kari Olsen',
    status: 'Completed',
    lastExecution: '2026-02-10',
    nextDue: '2027-02-10',
    evidence: ['microsoft-cloud-sikkerhet.pdf'],
    description: 'Microsoft leverer cloudtjenester og sikkerhet'
  },
  {
    id: 'C016',
    title: 'Planlegging av incidenthåndtering (5.24)',
    category: 'Sikkerhetshendelser',
    frequency: 'Yearly',
    owner: 'Erik Andersen',
    status: 'Overdue',
    lastExecution: '2025-01-15',
    nextDue: '2026-01-15',
    evidence: [],
    description: 'Etablere og dokumentere prosess for incidenthåndtering'
  },
  {
    id: 'C017',
    title: 'Vurdering av sikkerhetshendelser (5.25)',
    category: 'Sikkerhetshendelser',
    frequency: 'Quarterly',
    owner: 'Erik Andersen',
    status: 'Pending',
    lastExecution: '2025-12-01',
    nextDue: '2026-03-01',
    evidence: [],
    description: 'Dokumentere prosess for vurdering og beslutning om sikkerhetshendelser'
  },
  {
    id: 'C018',
    title: 'Håndtering av sikkerhetshendelser (5.26)',
    category: 'Sikkerhetshendelser',
    frequency: 'Quarterly',
    owner: 'Erik Andersen',
    status: 'Pending',
    lastExecution: '2025-12-15',
    nextDue: '2026-03-15',
    evidence: [],
    description: 'Etablere prosedyrer for håndtering av informasjonssikkerhetshendelser'
  },
  {
    id: 'C019',
    title: 'Læring fra sikkerhetshendelser (5.27)',
    category: 'Sikkerhetshendelser',
    frequency: 'Yearly',
    owner: 'Erik Andersen',
    status: 'Pending',
    lastExecution: '2025-06-01',
    nextDue: '2026-06-01',
    evidence: [],
    description: 'Dokumentere læring og forbedringer basert på sikkerhetshendelser'
  },
  {
    id: 'C020',
    title: 'Indsamling av bevismateriale (5.28)',
    category: 'Sikkerhetshendelser',
    frequency: 'Yearly',
    owner: 'Erik Andersen',
    status: 'Pending',
    lastExecution: '2025-07-01',
    nextDue: '2026-07-01',
    evidence: [],
    description: 'Etablere prosess for indsamling av digitalt bevismateriale'
  },
  {
    id: 'C021',
    title: 'Sikkerhet under driftsforstyrrelse (5.29)',
    category: 'Kontinuitet',
    frequency: 'Yearly',
    owner: 'Per Nilsen',
    status: 'Completed',
    lastExecution: '2026-01-10',
    nextDue: '2027-01-10',
    evidence: ['microsoft-bc-plan.pdf'],
    description: 'Microsoft leverer business continuity under driftsforstyrrelse'
  },
  {
    id: 'C022',
    title: 'IKT-parathet for business continuity (5.30)',
    category: 'Kontinuitet',
    frequency: 'Yearly',
    owner: 'Per Nilsen',
    status: 'Completed',
    lastExecution: '2026-01-15',
    nextDue: '2027-01-15',
    evidence: ['ikt-parathet-2026.pdf'],
    description: 'Microsoft sikrer IKT-parathet til understøttelse av business continuity'
  },
  {
    id: 'C023',
    title: 'Beskyttelse av optegnelser (5.33)',
    category: 'Etterlevelse',
    frequency: 'Yearly',
    owner: 'Sofie Berg',
    status: 'Completed',
    lastExecution: '2026-02-01',
    nextDue: '2027-02-01',
    evidence: ['dokumentbeskyttelse-2026.pdf'],
    description: 'Beskytte dokumenter i henhold til juridiske krav'
  },
  {
    id: 'C024',
    title: 'Uavhengig vurdering av sikkerhet (5.35)',
    category: 'Etterlevelse',
    frequency: 'Yearly',
    owner: 'Sofie Berg',
    status: 'Pending',
    lastExecution: '2025-10-01',
    nextDue: '2026-10-01',
    evidence: [],
    description: 'Gjennomføre revisjonsbasert vurdering av informasjonssikkerhet'
  },
  {
    id: 'C025',
    title: 'Dokumenterte driftsprosedyrer (5.37)',
    category: 'Drift',
    frequency: 'Yearly',
    owner: 'Per Nilsen',
    status: 'Completed',
    lastExecution: '2026-01-05',
    nextDue: '2027-01-05',
    evidence: ['ms-sms-gateway-dok.pdf'],
    description: 'Dokumentere driftsprosedyrer for Microsoft og SMS gateway'
  },
  {
    id: 'C026',
    title: 'Awareness og opplæring i sikkerhet (6.3)',
    category: 'Personal',
    frequency: 'Yearly',
    owner: 'Marte Solberg',
    status: 'Overdue',
    lastExecution: '2025-01-10',
    nextDue: '2026-01-10',
    evidence: [],
    description: 'Etablere årlig sikkerhetstrening og opplæringsprogram for alle medarbeidere'
  },
  {
    id: 'C027',
    title: 'Indrapportering av sikkerhetshendelser (6.8)',
    category: 'Personal',
    frequency: 'Yearly',
    owner: 'Marte Solberg',
    status: 'Pending',
    lastExecution: '2025-06-01',
    nextDue: '2026-06-01',
    evidence: [],
    description: 'Etablere prosess for medarbeidernes rapportering av sikkerhetshendelser'
  },
  {
    id: 'C028',
    title: 'Fysisk områdesikring (7.1)',
    category: 'Fysisk sikkerhet',
    frequency: 'Monthly',
    owner: 'Thomas Lund',
    status: 'Completed',
    lastExecution: '2026-03-01',
    nextDue: '2026-04-01',
    evidence: ['alarm-test-mars-2026.pdf'],
    description: 'Alarm utenfor åpningstid for fysisk områdesikring'
  },
  {
    id: 'C029',
    title: 'Sikring av kontorer og lokaler (7.3)',
    category: 'Fysisk sikkerhet',
    frequency: 'Monthly',
    owner: 'Thomas Lund',
    status: 'Completed',
    lastExecution: '2026-03-05',
    nextDue: '2026-04-05',
    evidence: ['lokalsikring-mars.pdf'],
    description: 'Sikring av kontorer utenfor arbeidstid'
  },
  {
    id: 'C030',
    title: 'Ryddeligt skrivebord og låst skærm (7.7)',
    category: 'Fysisk sikkerhet',
    frequency: 'Monthly',
    owner: 'Thomas Lund',
    status: 'Completed',
    lastExecution: '2026-03-10',
    nextDue: '2026-04-10',
    evidence: ['clean-desk-audit-mars.pdf'],
    description: 'Data i OneDrive og ingen faste plasser - clean desk policy'
  },
  {
    id: 'C031',
    title: 'Lagringsmedier (7.10)',
    category: 'Datasikkerhet',
    frequency: 'Quarterly',
    owner: 'Ingrid Haugen',
    status: 'Pending',
    lastExecution: '2025-12-01',
    nextDue: '2026-03-01',
    evidence: [],
    description: 'Kryptering med BitLocker (PC) - login styret. Behov for Mac-sikring'
  },
  {
    id: 'C032',
    title: 'Vedlikehold av utstyr (7.13)',
    category: 'Drift',
    frequency: 'Monthly',
    owner: 'Per Nilsen',
    status: 'Completed',
    lastExecution: '2026-03-12',
    nextDue: '2026-04-12',
    evidence: ['pc-vedlikehold-mars.pdf'],
    description: 'PC vedlikeholdes automatisk via Microsoft'
  },
  {
    id: 'C033',
    title: 'Brukerenheter (8.1)',
    category: 'Teknologi',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-01',
    nextDue: '2026-06-01',
    evidence: ['brukerenheter-oversikt-q1.pdf'],
    description: 'Sikre PC og Mac brukerenheter samt e-post på telefon'
  },
  {
    id: 'C034',
    title: 'Privilegerte tilgangsrettigheter (8.2)',
    category: 'Tilgangskontroll',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-05',
    nextDue: '2026-06-05',
    evidence: ['privilegert-tilgang-q1.pdf'],
    description: 'Styrt av nærmeste leder med dokumentasjon'
  },
  {
    id: 'C035',
    title: 'Beskyttelse mot malware (8.7)',
    category: 'Teknologi',
    frequency: 'Monthly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-13',
    nextDue: '2026-04-13',
    evidence: ['malware-scan-mars-2026.pdf'],
    description: 'Malwarebeskyttelse på PC (ikke på andre enheter)'
  },
  {
    id: 'C036',
    title: 'Styring av tekniske sårbarheter (8.8)',
    category: 'Teknologi',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-08',
    nextDue: '2026-06-08',
    evidence: ['sarbarhet-scan-q1.pdf'],
    description: 'Microsoft og prosess for programmer for sårbarhetsstyring'
  },
  {
    id: 'C037',
    title: 'Konfigurationsstyring (8.9)',
    category: 'Teknologi',
    frequency: 'Quarterly',
    owner: 'Per Nilsen',
    status: 'Completed',
    lastExecution: '2026-03-10',
    nextDue: '2026-06-10',
    evidence: ['config-management-q1.pdf'],
    description: 'Microsoft styring via verktøy for konfigurationsstyring'
  },
  {
    id: 'C038',
    title: 'Backup av information (8.13)',
    category: 'Kontinuitet',
    frequency: 'Monthly',
    owner: 'Per Nilsen',
    status: 'Completed',
    lastExecution: '2026-03-14',
    nextDue: '2026-04-14',
    evidence: ['backup-test-mars-2026.pdf'],
    description: 'Microsoft backup og politikker. Behov for testing og DR-plan'
  },
  {
    id: 'C039',
    title: 'Redundans i faciliteter (8.14)',
    category: 'Kontinuitet',
    frequency: 'Yearly',
    owner: 'Per Nilsen',
    status: 'Completed',
    lastExecution: '2026-01-20',
    nextDue: '2027-01-20',
    evidence: ['ms-redundans-2026.pdf'],
    description: 'Microsoft skaper redundans i IT-faciliteter'
  },
  {
    id: 'C040',
    title: 'Logging (8.15)',
    category: 'Overvåkning',
    frequency: 'Monthly',
    owner: 'Erik Andersen',
    status: 'Completed',
    lastExecution: '2026-03-11',
    nextDue: '2026-04-11',
    evidence: ['logging-rapport-mars.pdf'],
    description: 'Logging finnes mot kunderettede systemer - dokumenteres'
  },
  {
    id: 'C041',
    title: 'Overvåkning av aktiviteter (8.16)',
    category: 'Overvåkning',
    frequency: 'Monthly',
    owner: 'Erik Andersen',
    status: 'Completed',
    lastExecution: '2026-03-12',
    nextDue: '2026-04-12',
    evidence: ['aktivitet-mars-2026.pdf'],
    description: 'Kan se hvem som gjør hva på IP-nivå - dokumenteres'
  },
  {
    id: 'C042',
    title: 'Nettverkssikkerhet (8.20)',
    category: 'Nettverkssikkerhet',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-01',
    nextDue: '2026-06-01',
    evidence: ['network-security-q1.pdf'],
    description: 'Microsoft leverer nettverkssikkerhet'
  },
  {
    id: 'C043',
    title: 'Sikring av nettverkstjenester (8.21)',
    category: 'Nettverkssikkerhet',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-05',
    nextDue: '2026-06-05',
    evidence: ['network-services-q1.pdf'],
    description: 'Microsoft sikrer nettverkstjenester'
  },
  {
    id: 'C044',
    title: 'Segmentering av nettverk (8.22)',
    category: 'Nettverkssikkerhet',
    frequency: 'Yearly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-02-01',
    nextDue: '2027-02-01',
    evidence: ['network-segmentation-2026.pdf'],
    description: 'Microsoft leverer nettverkssegmentering'
  },
  {
    id: 'C045',
    title: 'Webfiltrering (8.23)',
    category: 'Nettverkssikkerhet',
    frequency: 'Quarterly',
    owner: 'Anna Johansen',
    status: 'Completed',
    lastExecution: '2026-03-08',
    nextDue: '2026-06-08',
    evidence: ['web-filtering-q1.pdf'],
    description: 'Microsoft leverer webfiltrering'
  },
  {
    id: 'C046',
    title: 'Bruk av kryptografi (8.24)',
    category: 'Kryptografi',
    frequency: 'Yearly',
    owner: 'Ingrid Haugen',
    status: 'Completed',
    lastExecution: '2026-02-10',
    nextDue: '2027-02-10',
    evidence: ['bitlocker-audit-2026.pdf'],
    description: 'BitLocker på PC for kryptering av data'
  },
  {
    id: 'C047',
    title: 'Sikker utviklingslivscyklus (8.25)',
    category: 'Applikasjonssikkerhet',
    frequency: 'Yearly',
    owner: 'Erik Andersen',
    status: 'Completed',
    lastExecution: '2026-01-15',
    nextDue: '2027-01-15',
    evidence: ['sdlc-prosess-trello.pdf'],
    description: 'Prosesser for oppstart av app/feature/fejlrettelse finnes i Trello'
  },
  {
    id: 'C048',
    title: 'Krav til applikasjonssikkerhet (8.26)',
    category: 'Applikasjonssikkerhet',
    frequency: 'Quarterly',
    owner: 'Erik Andersen',
    status: 'Completed',
    lastExecution: '2026-03-01',
    nextDue: '2026-06-01',
    evidence: ['code-review-q1-2026.pdf'],
    description: 'Kode review og begrensninger i deploy til produksjon'
  },
  {
    id: 'C049',
    title: 'Sikker systemarkitektur (8.27)',
    category: 'Applikasjonssikkerhet',
    frequency: 'Yearly',
    owner: 'Erik Andersen',
    status: 'Completed',
    lastExecution: '2026-02-01',
    nextDue: '2027-02-01',
    evidence: ['arkitektur-review-2026.pdf'],
    description: 'Kode review og sikker arkitektur med deploy-begrensninger'
  },
  {
    id: 'C050',
    title: 'Sikker programmering (8.28)',
    category: 'Applikasjonssikkerhet',
    frequency: 'Quarterly',
    owner: 'Erik Andersen',
    status: 'Completed',
    lastExecution: '2026-03-05',
    nextDue: '2026-06-05',
    evidence: ['secure-coding-q1.pdf'],
    description: 'Kode review med fokus på sikker programmering'
  },
  {
    id: 'C051',
    title: 'Sikkerhetstest under utvikling (8.29)',
    category: 'Applikasjonssikkerhet',
    frequency: 'Quarterly',
    owner: 'Erik Andersen',
    status: 'Completed',
    lastExecution: '2026-03-08',
    nextDue: '2026-06-08',
    evidence: ['security-testing-q1.pdf'],
    description: 'Kode review og sikkerhetstest før deploy til produksjon'
  },
  {
    id: 'C052',
    title: 'Adskillelse av miljøer (8.31)',
    category: 'Applikasjonssikkerhet',
    frequency: 'Yearly',
    owner: 'Erik Andersen',
    status: 'Completed',
    lastExecution: '2026-01-10',
    nextDue: '2027-01-10',
    evidence: ['miljoadskillelse-2026.pdf'],
    description: 'Adskillelse av utviklings-, test- og produksjonsmiljøer dokumenteres'
  },
  {
    id: 'C053',
    title: 'Endringsstyring (8.32)',
    category: 'Drift',
    frequency: 'Monthly',
    owner: 'Erik Andersen',
    status: 'Completed',
    lastExecution: '2026-03-10',
    nextDue: '2026-04-10',
    evidence: ['trello-endringer-mars.pdf'],
    description: 'Styres via Trello - DevOps. Release notes kommer'
  }
];

export const documents: Document[] = [
  {
    id: 'D001',
    name: 'roller-ansvar-2026.pdf',
    type: 'PDF',
    uploadedBy: 'Lars Hansen',
    uploadDate: '2026-02-15',
    version: '1.0',
    linkedTo: [{ type: 'control', id: 'C002' }],
    size: '1.2 MB'
  },
  {
    id: 'D002',
    name: 'ad-mfa-rapport-q1-2026.pdf',
    type: 'PDF',
    uploadedBy: 'Anna Johansen',
    uploadDate: '2026-03-01',
    version: '1.0',
    linkedTo: [{ type: 'control', id: 'C007' }],
    size: '2.1 MB'
  },
  {
    id: 'D003',
    name: 'microsoft-cloud-sikkerhet.pdf',
    type: 'PDF',
    uploadedBy: 'Kari Olsen',
    uploadDate: '2026-02-10',
    version: '1.0',
    linkedTo: [{ type: 'control', id: 'C015' }],
    size: '3.5 MB'
  },
  {
    id: 'D004',
    name: 'isae-3402-readiness-rapport.pdf',
    type: 'PDF',
    uploadedBy: 'Sofie Berg',
    uploadDate: '2026-02-20',
    version: '2.1',
    linkedTo: [],
    size: '5.8 MB'
  },
  {
    id: 'D005',
    name: 'backup-test-mars-2026.pdf',
    type: 'PDF',
    uploadedBy: 'Per Nilsen',
    uploadDate: '2026-03-14',
    version: '1.0',
    linkedTo: [{ type: 'control', id: 'C038' }],
    size: '2.7 MB'
  },
  {
    id: 'D006',
    name: 'malware-scan-mars-2026.pdf',
    type: 'PDF',
    uploadedBy: 'Anna Johansen',
    uploadDate: '2026-03-13',
    version: '1.0',
    linkedTo: [{ type: 'control', id: 'C035' }],
    size: '1.9 MB'
  },
  {
    id: 'D007',
    name: 'trello-endringer-mars.pdf',
    type: 'PDF',
    uploadedBy: 'Erik Andersen',
    uploadDate: '2026-03-10',
    version: '1.0',
    linkedTo: [{ type: 'control', id: 'C053' }],
    size: '1.5 MB'
  }
];

export const complianceEvents: ComplianceEvent[] = [
  {
    id: 'E001',
    title: 'Politikker for informasjonssikkerhet',
    type: 'control',
    date: '2026-04-10',
    owner: 'Lars Hansen',
    status: 'Upcoming'
  },
  {
    id: 'E002',
    title: 'Awareness og opplæring i sikkerhet',
    type: 'control',
    date: '2026-01-10',
    owner: 'Marte Solberg',
    status: 'Overdue'
  },
  {
    id: 'E003',
    title: 'ISAE 3402 Ekstern revisjon',
    type: 'audit',
    date: '2026-06-15',
    owner: 'Sofie Berg',
    status: 'Upcoming'
  },
  {
    id: 'E004',
    title: 'Planlegging av incidenthåndtering',
    type: 'control',
    date: '2026-01-15',
    owner: 'Erik Andersen',
    status: 'Overdue'
  },
  {
    id: 'E005',
    title: 'Administrasjon av tilgang',
    type: 'control',
    date: '2026-06-01',
    owner: 'Anna Johansen',
    status: 'Upcoming'
  },
  {
    id: 'E006',
    title: 'Informasjonssikkerhet i leverandørforhold',
    type: 'review',
    date: '2026-09-15',
    owner: 'Kari Olsen',
    status: 'Upcoming'
  }
];

export const alerts: Alert[] = [
  {
    id: 'A001',
    type: 'error',
    message: 'Awareness og opplæring i sikkerhet er forfalt med 63 dager',
    date: '2026-03-14',
    relatedTo: 'C026'
  },
  {
    id: 'A002',
    type: 'error',
    message: 'Planlegging av incidenthåndtering er forfalt med 58 dager',
    date: '2026-03-14',
    relatedTo: 'C016'
  },
  {
    id: 'A003',
    type: 'warning',
    message: 'Manglende dokumentasjon for politikker for informasjonssikkerhet',
    date: '2026-03-12',
    relatedTo: 'C001'
  },
  {
    id: 'A004',
    type: 'warning',
    message: 'ISAE 3402 revisjon planlagt om 93 dager - forbered dokumentasjon',
    date: '2026-03-13',
    relatedTo: 'E003'
  },
  {
    id: 'A005',
    type: 'info',
    message: '8 kontroller skal utføres denne måneden',
    date: '2026-03-01'
  },
  {
    id: 'A006',
    type: 'warning',
    message: 'Lagringsmedier kontroll forfaller snart - Mac kryptering mangler',
    date: '2026-02-25',
    relatedTo: 'C031'
  }
];

// Risk matrix data for heatmap
export const riskMatrixData = [
  { likelihood: 'High', low: 3, medium: 7, high: 9 },
  { likelihood: 'Medium', low: 2, medium: 5, high: 7 },
  { likelihood: 'Low', low: 1, medium: 3, high: 5 }
];

// Dashboard metrics
export const dashboardMetrics = {
  totalControls: controls.length,
  completedControls: controls.filter(c => c.status === 'Completed').length,
  pendingControls: controls.filter(c => c.status === 'Pending').length,
  overdueControls: controls.filter(c => c.status === 'Overdue').length,
  totalRisks: risks.length,
  highRisks: risks.filter(r => r.riskScore >= 7).length,
  mediumRisks: risks.filter(r => r.riskScore >= 4 && r.riskScore < 7).length,
  lowRisks: risks.filter(r => r.riskScore < 4).length,
  complianceScore: 82,
  openFindings: alerts.filter(a => a.type === 'error' || a.type === 'warning').length
};