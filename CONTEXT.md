# Project Context - SIMTEQ ISAE 3402 Compliance System

## Project Definition

```yaml
project:
  name: "SIMTEQ ISAE 3402 System"
  domain: "Compliance / Risk Management / Internal Controls"
  purpose: >
    Provide a simplified IT system for documenting, executing, and auditing
    internal controls in accordance with ISAE 3402.
```

This repository contains a working prototype of a role-based compliance management dashboard for Simteq AS. The main product problem is documentation and auditability: users need a clear way to prove which controls were performed, by whom, when, with what evidence, and under which approval flow.

## Problem Context

### Current Pain Points

- Internal control documentation is fragmented across tools.
- Processes are manual and time-consuming.
- Ownership and accountability are unclear.
- Traceability is weak: it is hard to verify who did what, when, and why.
- Evidence requirements are often ambiguous.
- Management lacks a reliable compliance overview.
- Auditors spend too much time requesting and validating documentation.

### Desired State

- Centralized risks, controls, evidence, policies, releases, and reports.
- Clear control ownership and due dates.
- Standardized evidence upload and version history.
- Approval and review workflows that preserve traceability.
- Dashboards for management, technical owners, and QA/compliance.
- Easy auditor access to complete documentation trails.

### Core Problem

The main challenge is not performing controls. The challenge is documenting controls correctly and making that documentation audit-ready.

## Actors And Roles

| Actor | Description | Key needs |
|---|---|---|
| Employee | Performs controls and uploads documentation | Clear requirements, fast process, avoid rework |
| CEO | Needs executive visibility into risk and compliance | Dashboard metrics, risk status, control status, calendar |
| CTO | Owns technical processes and traceability | Change logs, releases, access reviews, approvals |
| QA / Compliance | Ensures processes are followed and documented | Approval flows, control evidence, policies, reporting |
| Auditor | External reviewer of ISAE compliance | Easy access to evidence, traceability, and report outputs |

The implemented app currently exposes `ceo`, `cto`, and `qa` roles. The auditor demo user is seeded as a CEO-style profile.

## What This System Is

A Supabase-backed prototype for ISAE 3402 audit readiness with:

- Role-based authentication and routing.
- Risk register and risk category management.
- Internal control management with status, owner, frequency, evidence, and review workflows.
- Evidence bank with file upload, version history, and links to risks/controls.
- Compliance calendar generated from controls and events.
- CTO change log, release management, product registry, and access control.
- QA dashboard and policy inventory.
- CEO user management, role options, report template editor, and notification log.
- DOCX audit report generation and CSV/JSON/PDF export helpers.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 (`react-router`) |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage) |
| File storage | Supabase Storage bucket: `evidence` |
| Charts | Recharts |
| Notifications | Sonner |
| Icons | Lucide React |
| UI primitives | shadcn/Radix components under `src/app/components/ui/` |
| Documents / exports | `docx`, `jspdf`, CSV/JSON utilities |

## Folder Structure

```text
src/
  app/
    App.tsx
    routes.tsx
    components/       # Layouts, dialogs, report generator, sidebar tooling
      ui/             # shadcn/Radix primitive UI components
    hooks/            # Sidebar config and category helpers
    pages/            # CEO/shared pages
      cto/            # CTO-role pages
      qa/             # QA-role pages
    utils/            # Export and ID/category helpers
    data/             # Legacy mock/demo data used by a few helper components
  contexts/
    AuthContext.tsx   # Supabase auth + profile context
  lib/
    supabase.ts       # Supabase client
    types.ts          # TypeScript interfaces matching DB schema
  styles/             # Tailwind, theme, fonts, global CSS
supabase/
  schema.sql          # Full DB schema, RLS, policies, triggers
  seed.sql            # Demo seed data
```

## Routes And Role Access

| Role | Root route | Pages |
|---|---|---|
| `ceo` | `/` | dashboard, risks, controls, calendar, categories, users, report template, notifications |
| `cto` | `/cto` | overview, change log, releases, access control |
| `qa` | `/qa` | overview, controls, evidence, calendar, policies |

`ProtectedRoute` checks Supabase authentication and the `role` field from `profiles`. `LoginPage` redirects authenticated users to the correct role root.

Concrete routes:

- CEO: `/`, `/risks`, `/controls`, `/calendar`, `/categories`, `/users`, `/report-template`, `/notifications`
- CTO: `/cto`, `/cto/changelog`, `/cto/releases`, `/cto/access`
- QA: `/qa`, `/qa/controls`, `/qa/evidence`, `/qa/calendar`, `/qa/policies`

## Core Entities And Relations

```text
Profile/User
  owns controls, uploads documents, receives reminders, appears in notification logs

Risk
  has many controls through risk_controls
  belongs to a risk category by category name

Control
  can be linked to many risks
  can have evidence documents and document versions
  appears in calendar due dates and report generation

Document
  has many document_versions
  links to risks or controls through document_links

ChangeLog / Product / Release / ReleaseChange
  support CTO traceability from technical changes to approvals and releases

ReportTemplate / ReportTemplateSection
  define reusable audit report content
```

## Database Tables

| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` with `full_name`, `role`, `email`, `department` |
| `roles` | Configurable app role options shown in user/access management |
| `risks` | Risk register |
| `controls` | Internal controls |
| `risk_categories` | Editable category registry for risks and controls |
| `risk_controls` | Many-to-many mapping between risks and controls |
| `documents` | Evidence/document metadata |
| `document_versions` | Version history for documents |
| `document_links` | Links documents to risks or controls |
| `compliance_events` | Calendar events such as audits, reviews, and deadlines |
| `alerts` | Dashboard alerts |
| `notification_log` | Logged notification/invite/reminder events |
| `reminders` | Per-user email reminder settings |
| `change_logs` | CTO change request records |
| `products` | Product registry |
| `releases` | Product release tracking |
| `release_changes` | Release-level changelog items |
| `policies` | ISO/GDPR/security policy inventory |
| `report_templates` | Audit report template headers and defaults |
| `report_template_sections` | Ordered report template section content |

All tables have RLS enabled. Most policies allow authenticated users full access. `reminders` is scoped per user. Storage policies require authentication for the private `evidence` bucket.

## Core Processes

### Control Execution

1. User reviews assigned or relevant controls.
2. User performs the control activity.
3. User uploads evidence or links an existing document.
4. Evidence is versioned and attached to the control.
5. Reviewer approves the control, which marks it completed.
6. Calendar, dashboards, exports, and reports reflect the updated control state.

### Evidence Management

1. Upload document into the private `evidence` bucket.
2. Insert metadata in `documents`.
3. Insert an initial row in `document_versions`.
4. Link the document to a risk or control through `document_links`.
5. Later uploads create new versions and update `documents.current_version`.

### CTO Traceability

1. Create change log entry.
2. Associate change with environment, status, and optional risk/control references.
3. Track product releases and release changes.
4. Record approvals, release dates, and deployment status.

### Reporting

1. Configure default report template and ordered sections.
2. Generate report content from controls, risks, evidence, and template sections.
3. Export as DOCX through `AuditReportGenerator`.

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |

Set these in `.env.local` at the project root. Never commit `.env.local`.

## Demo Users

After creating users in Supabase Auth, run `supabase/seed.sql` to update profile names, departments, and roles.

| Email | Password | Role |
|---|---|---|
| `ceo@simteq.no` | `demo1234` | `ceo` |
| `cto@simteq.no` | `demo1234` | `cto` |
| `qa@simteq.no` | `demo1234` | `qa` |
| `qa2@simteq.no` | `demo1234` | `qa` |
| `auditor@simteq.no` | `demo1234` | `ceo` |

## Key Design Decisions

1. Snake_case DB fields: TypeScript interfaces mirror Supabase column names. Keep React state and form payloads aligned with schema names.
2. Role-based route roots: CEO uses `/`, CTO uses `/cto`, QA uses `/qa`; there is no `/dashboard` route.
3. Configurable sidebars: `ALL_PAGES` and `VIEW_DEFAULTS` in `src/app/components/allPages.tsx` define visible page options per role. User-specific choices are persisted in `localStorage`.
4. Inline Supabase calls: Pages and dialogs call Supabase directly. There is no centralized service layer.
5. Evidence versioning: Active evidence workflows use `documents`, `document_versions`, and `document_links`.
6. Report templates: Report content is stored in `report_templates` and `report_template_sections` and consumed by the DOCX generator.
7. Legacy mock data: `src/app/data/mockData.ts` still supports a few helper/export components, but active app pages should prefer Supabase data.

## Local Commands

```bash
npm run dev
npm run build
npm run preview
npm start
```

There is currently no configured unit test, integration test, or lint command. Use `npm run build` for TypeScript and production build verification.
