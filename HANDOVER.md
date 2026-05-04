# Prosjektoverlevering - SIMTEQ ISAE 3402 Compliance Dashboard

Dato: 2026-05-04  
Status: Fungerende prototype / MVP-grunnlag for videreutvikling

## 1. Kort Sammendrag

Dette repositoryet inneholder en React/TypeScript-prototype for et rollebasert ISAE 3402 compliance-system for Simteq AS. Systemet er bygget for å samle risikoer, kontroller, evidens, policies, tekniske endringer, release-sporing, rapportmaler og compliance-kalender i ett grensesnitt.

Løsningen bruker Supabase for database, autentisering og privat lagring av evidensfiler. Frontend er bygget med React 18, Vite, Tailwind CSS v4, shadcn/Radix-komponenter og Supabase JavaScript-klient.

Prosjektet er egnet som videreutviklingsgrunnlag, men må ikke behandles som produksjonsklart uten ekstra arbeid på sikkerhet, tilgangsstyring, migrasjonsrutiner, testing, logging, e-postutsending og deployment-rutiner.

## 2. Viktigste Dokumenter

| Fil | Formål |
|---|---|
| `README.md` | Praktisk oppstart, features, tech stack, Supabase-oppsett og scripts |
| `CONTEXT.md` | Produktkontekst, problemforståelse, aktører, prosesser og domene |
| `CLAUDE.md` | Teknisk arbeidskontekst for Claude/AI-agent og utviklere |
| `HANDOVER.md` | Denne filen: overleveringsstatus, risikoer, kjente hull og anbefalt videre arbeid |
| `supabase/schema.sql` | Hovedskjema for database, RLS policies, storage policies og trigger |
| `supabase/seed.sql` | Demo-data og eksempelinnhold |
| `supabase/migrations/` | Supplerende SQL for reparasjon/oppdateringer på eksisterende database |

Anbefalt leserekkefølge for ny utviklingspartner:

1. `HANDOVER.md`
2. `README.md`
3. `CONTEXT.md`
4. `CLAUDE.md`
5. `supabase/schema.sql`
6. Relevante filer under `src/app/pages/` og `src/app/components/`

## 3. Hva Systemet Gjør I Dag

Systemet har tre aktive roller:

| Rolle | Root route | Hovedfunksjoner |
|---|---|---|
| `ceo` | `/` | Dashboard, risikoer, kontroller, kalender, kategorier, brukere, rapportmal, notifikasjonslogg |
| `cto` | `/cto` | Teknisk dashboard, changelog, releases, produkter og access control |
| `qa` | `/qa` | QA-dashboard, kontroller, evidensbank, kalender og policy management |

Kjernefunksjoner som finnes:

- Login med Supabase Auth.
- Rollebasert routing via `ProtectedRoute`.
- Risiko- og kontrollregister.
- Kategoriadministrasjon for risiko/kontroll.
- Evidensbank med dokumentmetadata, filopplasting og versjonshistorikk.
- Kobling mellom dokumenter, risikoer og kontroller.
- Compliance-kalender.
- CTO change log og release management.
- QA policy inventory.
- Brukeradministrasjon/profilhåndtering.
- Rapportmal-editor.
- DOCX-generering for audit report.
- CSV/JSON/PDF-eksporthjelpere.
- Mock notification log for invitasjoner og reminders.

## 4. Teknisk Arkitektur

### Frontend

- Framework: React 18 + TypeScript.
- Build: Vite 6.
- Styling: Tailwind CSS v4.
- Routing: `react-router` v7.
- UI primitives: shadcn/Radix-komponenter i `src/app/components/ui/`.
- Icons: `lucide-react`.
- Charts: `recharts`.
- Dokumentgenerering: `docx`.
- PDF/eksport: `jspdf` og egne helpers.

### Backend

- Supabase PostgreSQL.
- Supabase Auth.
- Supabase Storage med privat bucket `evidence`.
- RLS er aktivert på tabellene.
- De fleste policies tillater foreløpig full tilgang for alle autentiserte brukere.

### Viktige Frontend-Filer

| Fil/mappe | Formål |
|---|---|
| `src/main.tsx` | App entry point |
| `src/app/App.tsx` | Overordnet app setup |
| `src/app/routes.tsx` | Browser routes og rollebaserte route trees |
| `src/contexts/AuthContext.tsx` | Auth state, Supabase user og profile |
| `src/lib/supabase.ts` | Supabase client |
| `src/lib/types.ts` | TypeScript-typer som matcher DB-tabeller |
| `src/app/components/ProtectedRoute.tsx` | Beskytter routes og sjekker roller |
| `src/app/components/allPages.tsx` | Registry for sidebar-sider per rolle |
| `src/app/hooks/useSidebarConfig.ts` | Lokal sidebar-konfigurasjon |
| `src/app/components/AuditReportGenerator.tsx` | Genererer DOCX audit report |
| `src/app/pages/ReportTemplateEditor.tsx` | Redigerer rapportmaler |
| `src/app/pages/Evidence.tsx` | Evidensbank og dokumenthåndtering |
| `src/app/pages/ControlManagement.tsx` | Kontrollregister, delt mellom CEO og QA |
| `src/app/pages/ComplianceCalendar.tsx` | Kalender, delt mellom CEO og QA |

## 5. Database Og Supabase

Hovedskjemaet ligger i `supabase/schema.sql`.

Viktige tabeller:

- `profiles`
- `roles`
- `risks`
- `controls`
- `risk_categories`
- `risk_controls`
- `documents`
- `document_versions`
- `document_links`
- `compliance_events`
- `alerts`
- `notification_log`
- `reminders`
- `change_logs`
- `products`
- `releases`
- `release_changes`
- `policies`
- `report_templates`
- `report_template_sections`

Storage:

- Bucket-navn: `evidence`
- Skal være privat.
- Storage policies krever autentisert bruker.

Viktig merknad:

`supabase/schema.sql` er hovedkilden for nye miljøer. Filene i `supabase/migrations/` er laget for å reparere/oppdatere eksisterende Supabase-miljøer og bør gjennomgås før de kjøres i produksjon.

## 6. Lokal Oppstart

Installer dependencies:

```bash
npm install
```

Lag `.env.local` i repository-roten:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Sett opp Supabase:

1. Opprett Supabase-prosjekt.
2. Kjør `supabase/schema.sql` i Supabase SQL Editor.
3. Opprett privat storage bucket `evidence`.
4. Opprett demo-brukere i Supabase Auth.
5. Kjør `supabase/seed.sql`.

Start utviklingsserver:

```bash
npm run dev
```

Bygg produksjonsversjon:

```bash
npm run build
```

Det finnes per nå ingen konfigurert test runner eller lint-kommando. `npm run build` er derfor minimumssjekken før overlevering/deploy.

## 7. Demo-Brukere

Opprett disse manuelt i Supabase Auth med passord `demo1234`, og kjør deretter `supabase/seed.sql`:

| E-post | Rolle |
|---|---|
| `ceo@simteq.no` | `ceo` |
| `cto@simteq.no` | `cto` |
| `qa@simteq.no` | `qa` |
| `qa2@simteq.no` | `qa` |
| `auditor@simteq.no` | `ceo` i demo |

Auditor finnes som rollevalg i deler av dataoppsettet, men full auditor-opplevelse er ikke implementert som egen route tree.

## 8. Deployment

Repositoryet inneholder `railway.json`.

Railway-konfigurasjonen:

- Build command: `npm run build`
- Start command: `npx serve dist -s -l ${PORT:-4173}`
- Healthcheck: `/`

Viktig:

- `serve` ligger ikke eksplisitt i `package.json` per nå. Railway kan installere/kjøre via `npx`, men for mer robust produksjonsoppsett bør `serve` legges til som dependency eller startstrategien endres.
- Produksjonsmiljø må ha `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` satt.
- Supabase-miljø for produksjon bør ikke bruke demo seed-data uten gjennomgang.

## 9. Kjente Begrensninger

Dette er de viktigste punktene en videreutvikler bør kjenne til:

1. Systemet er en prototype, ikke ferdig produksjonssystem.
2. Det finnes ingen test runner, unit tests, integration tests eller e2e tests.
3. Det finnes ingen konfigurert lint-kommando.
4. Mange Supabase RLS policies gir alle autentiserte brukere full tilgang til tabeller.
5. E-postutsending er mock-basert. Reminders og invitasjoner logges, men sendes ikke via ekte e-posttjeneste.
6. Brukeropprettelse er delvis manuell via Supabase Auth Dashboard.
7. Noen eksport- og dashboard-hjelpere bruker fortsatt `src/app/data/mockData.ts`.
8. Det finnes ingen sentral data service layer eller query cache; Supabase-kall gjøres inline i sider og dialoger.
9. Feilhåndtering er funksjonell, men ikke helhetlig standardisert.
10. Audit logging er begrenset og bør styrkes for et compliance-produkt.
11. Auditor-rollen er ikke fullverdig implementert som egen brukeropplevelse.
12. Migrasjoner håndteres som SQL-filer, ikke med en komplett migrasjonsflyt/CI.
13. `package.json` har fortsatt navnet `@figma/my-make-file`, som bør endres før profesjonell overlevering.
14. `ATTRIBUTIONS.md` omtaler prosjektet som en Figma Make-fil, som bør ryddes eller omformuleres.

## 10. Produksjonsgap Som Bør Lukkes

Før systemet brukes i en reell bedriftssammenheng, bør følgende arbeid prioriteres:

### Sikkerhet Og Tilgang

- Stramme inn RLS policies etter faktisk rollemodell.
- Skille mellom CEO, CTO, QA, auditor og eventuelle ansatte på DB-nivå.
- Innføre least-privilege tilgang for dokumenter, kontroller og risikoer.
- Avklare hvem som kan lese, skrive, slette og godkjenne evidens.
- Vurdere audit trail-tabeller for kritiske endringer.

### Autentisering Og Brukere

- Erstatte manuell Supabase Auth-opprettelse med kontrollert invite/onboarding-flow.
- Koble brukeradministrasjon til ekte e-postinvitasjoner.
- Avklare om MFA, SSO eller organisasjonstilhørighet er krav.
- Implementere egen auditor-opplevelse hvis auditorer skal bruke systemet direkte.

### Testing Og Kvalitet

- Legge til linting.
- Legge til TypeScript-strenghet der det er hensiktsmessig.
- Legge til unit tests for utils og kritiske komponenter.
- Legge til integration/e2e tests for login, rolle-routing, kontrollflyt og evidensopplasting.
- Koble `npm run build`, lint og tests til CI.

### Data Og Migrasjoner

- Etablere formell migrasjonsflyt for Supabase.
- Skille tydelig mellom schema, migrations og seed/demo-data.
- Lage produksjons-safe seed eller bootstrap-script.
- Lage rollback/backup-rutine.

### Drift Og Observability

- Standardisere deployment til Railway eller annen hosting.
- Sikre miljøvariabler og secrets.
- Legge til runtime logging og feilsporing.
- Legge til monitorering for frontend, Supabase og storage.
- Dokumentere backup, restore og incident response.

### Produkt Og UX

- Avklare endelig rollemodell og permissions.
- Avklare hvilke ISAE 3402-prosesser systemet faktisk skal støtte.
- Validere rapportgeneratoren mot reelle audit-krav.
- Avklare hva som er kundespesifikt for Simteq vs generisk produktlogikk.
- Rydde bort eller erstatte gjenværende mock data.

## 11. Anbefalt Videreutviklingsrekkefølge

Forslag til praktisk rekkefølge:

1. Rydd prosjektmetadata: endre package name, oppdater attribution-tekst og fjern Figma/prototype-navn der det ikke skal stå.
2. Kjør full lokal verifikasjon med ny Supabase-instans fra `schema.sql` og `seed.sql`.
3. Dokumenter faktisk deploy-oppsett og test Railway-deploy fra scratch.
4. Legg til lint, test runner og minst noen kritiske e2e-tests.
5. Design endelig rolle- og permissionmodell.
6. Stram inn RLS policies i Supabase.
7. Bygg ekte invite-flow og e-postutsending.
8. Fjern avhengighet til `mockData.ts` fra aktive brukerflows.
9. Etabler migrasjonsrutine og CI-sjekker.
10. Implementer full auditor-rolle hvis dette er et krav.
11. Gjennomfør sikkerhetsreview før produksjonsbruk.

## 12. Kodekonvensjoner

Eksisterende mønstre som bør følges:

- Databasefelter holdes som `snake_case` i TypeScript-typer og form payloads.
- Supabase client importeres fra `src/lib/supabase.ts`.
- DB-relaterte interfaces ligger i `src/lib/types.ts`.
- UI primitives ligger i `src/app/components/ui/`.
- Nye sidebar-sider bør registreres i `src/app/components/allPages.tsx`.
- `ControlManagement` og `ComplianceCalendar` brukes i flere rolletrær, så endringer der bør testes både som CEO og QA.
- Unngå nye store abstraksjoner før eksisterende inline Supabase-mønster enten videreføres bevisst eller erstattes samlet.

## 13. Viktige Risikoer Ved Overtakelse

| Risiko | Konsekvens | Anbefalt tiltak |
|---|---|---|
| For åpne RLS policies | Brukere kan få mer datatilgang enn ønsket | Redesign policies etter rollemodell |
| Manglende tester | Endringer kan brekke kritiske flows uten varsel | Innfør lint/test/e2e tidlig |
| Mock e-post | Reminders/invites ser ferdige ut, men sender ikke faktisk | Integrer e-postleverandør |
| Manuell brukeropprettelse | Dårlig driftbarhet og risiko for feil | Bygg invite/onboarding-flow |
| Legacy mock data | Forvirring rundt hva som er live data | Fjern eller isoler mock data |
| Uformell migrasjonshåndtering | Vanskelig å vedlikeholde flere miljøer | Bruk Supabase migrations/CLI eller tilsvarende |
| Manglende audit trail | Svak compliance-verdi i reell bruk | Legg til endringslogg for kritiske objekter |

## 14. Definisjon Av "Ferdig Nok" For Produksjon

En mulig minimumsdefinisjon før produksjonsbruk:

- Rollemodell er avklart og håndhevet i både frontend og database.
- RLS policies er testet for hver rolle.
- Ekte e-postutsending fungerer.
- Brukeropprettelse/invitasjon fungerer uten manuell Supabase-operasjon.
- Evidensopplasting, versjonering og tilgang er testet.
- Audit report-generator er validert av fagperson.
- Minst kritiske flows har e2e-tests.
- CI kjører build, lint og tests.
- Deployment, rollback og backup er dokumentert.
- Demo-data er skilt fra produksjonsdata.

## 15. Spørsmål Ny Utviklingspartner Bør Avklare Tidlig

- Skal dette bli et internt Simteq-verktøy eller et generisk SaaS-produkt?
- Skal auditorer ha direkte innlogging, eller kun eksporterte rapporter/evidenspakker?
- Hvilke handlinger krever godkjenning, og hvem kan godkjenne?
- Skal systemet støtte flere selskaper/tenants?
- Hvilke ISAE 3402-kontroller er faktiske krav, og hvilke er demo-innhold?
- Hvilken e-postleverandør og hostingmodell skal brukes?
- Hvilke data må logges for å være audit-ready?
- Skal Supabase beholdes som backend, eller skal det bygges egen API/backend?

## 16. Nåværende Verifikasjonsnivå

Per nå er forventet minimumsverifikasjon:

```bash
npm run build
```

Siden prosjektet mangler test runner og linter, bør en overtakende bedrift ikke tolke grønn build som full kvalitetssikring. Den bekrefter primært at appen kompilerer og kan bygges.

## 17. Oppsummering

Prosjektet har et godt MVP-fundament og mye relevant domenefunksjonalitet for ISAE 3402 audit readiness. Det viktigste ved videreutvikling er å profesjonalisere grunnmuren: tilgangsstyring, produksjonsoppsett, tester, migrasjoner, e-post, audit trail og tydelig skille mellom demo og reell funksjonalitet.

`README.md`, `CONTEXT.md` og `CLAUDE.md` gir nyttig teknisk og produktmessig kontekst. Denne overleveringsfilen bør brukes som inngangsdokument for prosjektstatus og videre arbeid.
