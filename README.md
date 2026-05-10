# ISAE 3402 Compliance Dashboard - Prototype 1 (MADS)

A role-based compliance management dashboard prototype for ISAE 3402 Type II audit readiness. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

The original Figma design is available at: https://www.figma.com/design/zlyjZheSoVBlaL7vwmIsYB/Prototype-1---MADS

## Features

- **CEO view**: executive dashboard metrics, risk register, control overview, compliance calendar, risk categories, user management, report templates, and notification log
- **CTO view**: technical dashboard, IT change log, release management, product tracking, and access control
- **QA view**: QA dashboard with charts, internal control management, evidence bank with upload/version history, compliance calendar, and policy inventory
- **Evidence management**: private Supabase Storage bucket, document metadata, document versions, and links to risks or controls
- **Reporting and exports**: DOCX audit report generation plus CSV/JSON/PDF export helpers
- **Reminders and notifications**: per-user reminder configuration and logged notification events
- **Supabase-backed data**: PostgreSQL tables, Supabase Auth, private file storage, RLS policies, and seed data

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 (`react-router`) |
| Backend | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage bucket: `evidence` |
| Charts | Recharts |
| Notifications | Sonner |
| Icons | Lucide React |
| UI primitives | shadcn/Radix components under `src/app/components/ui/` |
| Documents / exports | `docx`, `jspdf`, CSV/JSON helpers |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a project at https://supabase.com.

### 3. Configure environment variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in Supabase under Settings -> API.

### 4. Run the database schema and migrations

In the Supabase SQL Editor, paste and run `supabase/schema.sql`.

This creates the public tables, RLS policies, triggers, and storage policies used by the app.

Then run the SQL files in `supabase/migrations/` in filename order. The final
`2026_05_type2_zz_full_demo_data.sql` migration installs a demo-fill helper
that `supabase/seed.sql` calls after the base rows are inserted.

### 5. Create the storage bucket

In Supabase Storage, create a private bucket named `evidence`.

### 6. Create demo users

In Supabase -> Authentication -> Users, add these users with password `demo1234`:

| Email | Role |
|---|---|
| `ceo@simteq.no` | `ceo` |
| `cto@simteq.no` | `cto` |
| `qa@simteq.no` | `qa` |
| `qa2@simteq.no` | `qa` |
| `auditor@simteq.no` | `ceo` |

### 7. Seed the database

In the Supabase SQL Editor, paste and run `supabase/seed.sql`.

The seed file updates profile rows for the demo users and inserts roles, risks, controls, categories, documents, compliance events, alerts, change logs, products, releases, policies, report templates, and the full demo records needed to keep every main app screen populated.

### 8. Start the development server

```bash
npm run dev
```

Open http://localhost:5173 and log in with any demo user.

## Role-Based Access

| Role | Root route | Pages |
|---|---|---|
| `ceo` | `/` | dashboard, risks, controls, calendar, categories, users, report template, notifications |
| `cto` | `/cto` | overview, change log, releases, access control |
| `qa` | `/qa` | overview, controls, evidence, calendar, policies |

Concrete routes:

- CEO: `/`, `/risks`, `/controls`, `/calendar`, `/categories`, `/users`, `/report-template`, `/notifications`
- CTO: `/cto`, `/cto/changelog`, `/cto/releases`, `/cto/access`
- QA: `/qa`, `/qa/controls`, `/qa/evidence`, `/qa/calendar`, `/qa/policies`

After login, the app redirects users to the correct role root. `ProtectedRoute` blocks unauthenticated users and users with the wrong profile role.

## Project Structure

```text
src/
  app/
    App.tsx
    routes.tsx
    components/       Shared layouts, dialogs, sidebar tooling, reports
      ui/             shadcn/Radix primitive UI components
    hooks/            Sidebar config and category helpers
    pages/            CEO/shared pages
      cto/            CTO pages
      qa/             QA pages
    utils/            Export and ID/category helpers
    data/             Legacy mock/demo data used by a few helpers
  contexts/
    AuthContext.tsx   Supabase auth + profile state
  lib/
    supabase.ts       Supabase client
    types.ts          TypeScript interfaces matching DB schema
  styles/             Tailwind, theme, font, and global CSS
supabase/
  schema.sql          Database schema, RLS, policies, triggers
  seed.sql            Demo seed data
```

## Database Tables

The schema defines:

`profiles`, `roles`, `risks`, `controls`, `control_objectives`, `risk_categories`, `risk_controls`, `documents`, `document_versions`, `document_links`, `compliance_events`, `alerts`, `notification_log`, `reminders`, `change_logs`, `products`, `releases`, `release_changes`, `policies`, `report_templates`, `report_template_sections`, `audit_periods`, `control_executions`, `deviations`, `remediation_actions`, `auditor_requests`, and `management_assertions`.

All tables have Row Level Security enabled. Most policies allow authenticated users full access. `reminders` is scoped to the owning user. Storage policies require authentication for the private `evidence` bucket.

## Development Notes

- Database-facing TypeScript interfaces live in `src/lib/types.ts` and use snake_case to match Supabase columns.
- Supabase calls are made inline in pages and dialogs through `src/lib/supabase.ts`; there is no separate data service layer.
- Sidebar page options are registered in `src/app/components/allPages.tsx`.
- `ControlManagement` and `ComplianceCalendar` are shared by CEO and QA route trees.
- `src/app/data/mockData.ts` is legacy/demo support. Prefer Supabase-backed data for active features.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server at http://localhost:5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm start` | Preview build on `0.0.0.0`, used by Railway |

There is currently no configured test runner or linter. Use `npm run build` as the main verification command.
