# Project Context – SIMTEQ ISAE 3402 Compliance System

## Project definition

```yaml
project:
  name: "SIMTEQ ISAE 3402 System"
  domain: "Compliance / Risk Management / Internal Controls"
  purpose: >
    Design a simplified IT system to support documentation, execution,
    and auditability of internal controls in accordance with ISAE 3402.
```

---

## Problem context

### Current state (pain points)
- Documentation of internal controls is fragmented across multiple tools
- Processes are manual and time-consuming
- Lack of clear ownership and accountability
- Difficult to track who did what, when, and why
- Unclear what qualifies as sufficient documentation (evidence)
- High risk of errors and missing documentation
- Poor visibility for management
- Difficult for auditors to verify compliance

### Desired state
- Centralized system for risks, controls, and documentation
- Clear ownership of tasks and controls
- Full traceability (who, what, when)
- Standardized documentation process
- Easy access for auditors
- Reduced manual work and duplication
- Clear overview via dashboards

### Core problem
> The main challenge is not *performing* controls, but *documenting* them correctly and ensuring auditability.

---

## Actors & roles

| Actor | Description | Key needs |
|---|---|---|
| **Employee** | Performs controls and uploads documentation | Clear requirements, fast process, avoid rework |
| **CEO** | Needs overview of risks and compliance status | Dashboard, control status, risk overview |
| **CTO** | Responsible for technical processes and traceability | Who did what/when, link between releases and controls |
| **QA / Compliance** | Ensures processes are followed and documented correctly | Approval flows, consistent structure |
| **Auditor** | External reviewer of ISAE compliance | Easy access to documentation, clear traceability |

---

## Core entities & relations

```
User ──owns──► Control ──has_many──► Evidence
     └─creates──► Evidence           └──belongs_to──► User
     └─approves──► Approval
     └─receives──► Notification

Risk ──has_many──► Control
     └─updated_by──► User

Control ──belongs_to──► Risk
        ──assigned_to──► User
        ──has_many──► Evidence, Approval, Issue

Report ──generated_from──► Control, Risk, Evidence
```

---

## Core processes

### Control execution flow
1. Receive notification
2. Open assigned control
3. Perform control
4. Upload evidence
5. Submit for approval
6. Receive approval or feedback

### Audit flow
1. Auditor accesses system
2. Reviews controls and evidence
3. Checks traceability
4. Requests clarification if needed

---

## Functional requirements

- Register risks
- Create and manage controls
- Assign responsibility
- Upload and link documentation
- Track status of controls
- Approval workflow
- Notifications and reminders
- Dashboard overview
- Audit reporting

## Non-functional requirements

- Must be simple and intuitive
- Reduce manual work
- High traceability
- Support both technical and non-technical users
- Reliable for audits
- Scalable for future needs

---

## CATWOE analysis (SSM)

| Element | Description |
|---|---|
| **Customers** | SIMTEQ customers, Auditors, Employees |
| **Actors** | Employees, Management |
| **Transformation** | Manual, fragmented documentation → Structured digital system with full traceability |
| **Worldview** | Trust and credibility are critical when handling sensitive data. Compliance is necessary to maintain business relationships. |
| **Owner** | SIMTEQ management |
| **Environment** | ISAE 3402 requirements, resource constraints, resistance to change, GDPR, technical limitations |

---

## Key insights

- The biggest pain point is **documentation**, not execution
- Users need guidance on what "good documentation" means
- Lack of visibility creates uncertainty for management
- Traceability is critical for CTO and auditors
- Simplicity is key for adoption

---

## What this system is

A prototype ISAE 3402 compliance management dashboard for Simteq AS (Norwegian IT services company). The application is role-based and serves three types of users:

- **CEO** – high-level compliance overview, risk register (with linked controls), compliance calendar
- **CTO** – technical change log, release management, access control / user management
- **QA** – control management, evidence upload, policy management, QA dashboard

The project uses Supabase as a fully hosted backend (PostgreSQL database, Auth, Storage).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend / DB | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth (email + password) |
| File storage | Supabase Storage (bucket: `evidence`) |
| Charts | Recharts |
| Notifications | Sonner (toast) |
| Icons | Lucide React |
| UI primitives | Custom components under `src/app/components/ui/` |

---

## Folder structure

```
src/
  app/
    components/       # Shared layout and dialog components
      ui/             # Primitive UI components (Button, Dialog, Badge, etc.)
    pages/
      cto/            # CTO-role pages
      qa/             # QA-role pages
    utils/            # Helpers (exportUtils, etc.)
  contexts/
    AuthContext.tsx   # Supabase auth + profile context
  lib/
    supabase.ts       # Supabase client
    types.ts          # TypeScript interfaces matching DB schema
supabase/
  schema.sql          # Full DB schema – run first in Supabase SQL Editor
  seed.sql            # Seed/mock data – run after schema.sql
```

---

## Database tables

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` with `full_name`, `role`, `department` |
| `risks` | Risk register (R001–R013+) |
| `controls` | Internal controls (C001–C053+) |
| `risk_controls` | Many-to-many mapping between risks and controls |
| `documents` | Document metadata (name, type, size, current version) |
| `document_versions` | Version history for each document |
| `document_links` | Attaches a document to any entity (control, risk, policy, release) |
| `compliance_events` | Calendar events (audits, deadlines, reviews, training) |
| `alerts` | System-wide notifications |
| `reminders` | Per-user email reminders linked to control due dates |
| `change_logs` | IT change requests and their approval status |
| `products` | Product registry (name, description, owner) |
| `releases` | Software release tracking per product (version, status, environment, approvals) |
| `release_changes` | Changelog items per release (Feature/Bug Fix/Security/Breaking Change/Performance/Other) |
| `policies` | ISO 27001 / GDPR policy inventory |

---

## Roles and routing

| Role | Login URL → redirect | Layout accent |
|---|---|---|
| `ceo` | `/` → `/dashboard` | Blue/slate sidebar |
| `cto` | `/` → `/cto/dashboard` | Blue-700 sidebar |
| `qa` | `/` → `/qa/dashboard` | Emerald-600 sidebar |

Routes are protected by `ProtectedRoute` which checks both authentication and the `role` field on the user's profile.

---

## Environment variables

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase project → Settings → API → anon/public key |

Set these in `.env.local` at the project root (never commit this file).

---

## Demo users (after running seed.sql)

| Email | Password | Role |
|---|---|---|
| `ceo@simteq.no` | `demo1234` | CEO |
| `cto@simteq.no` | `demo1234` | CTO |
| `qa@simteq.no` | `demo1234` | QA |
| `qa2@simteq.no` | `demo1234` | QA |
| `auditor@simteq.no` | `demo1234` | CEO |

Users must be created in Supabase Auth first (Authentication → Users → Add User), then `seed.sql` updates the profile rows with names, departments and roles.

---

## Key design decisions

1. **Snake_case DB fields** – all TypeScript interfaces in `src/lib/types.ts` use snake_case to match Supabase column names directly. The old mock data used camelCase; do not mix the two.

2. **Auto-generated IDs** – risks are `R001`–`R013`+, controls are `C001`–`C053`+. New records query the current max ID and increment. Change logs use `CHG-001` format (UUID primary key, `change_id` text field).

3. **Evidence storage path** – files are stored at `controls/{controlId}/{docId}-{filename}` or `documents/{docId}/{filename}`. Download uses signed URLs (1 hour expiry).

4. **Four-eye principle** – the `ControlDetailsDialog` "Approve" button changes control status to `Completed` and is intended to be used by a second reviewer.

5. **RLS** – all tables have Row Level Security enabled. Most tables allow all authenticated users full access. `reminders` is scoped to the owning user only. The `evidence` storage bucket requires authentication.
