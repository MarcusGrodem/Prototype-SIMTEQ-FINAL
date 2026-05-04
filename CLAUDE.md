# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Project Snapshot

This is a React 18 + TypeScript + Vite prototype for a role-based ISAE 3402 compliance dashboard for Simteq. Supabase provides Postgres, Auth, and private evidence file storage.

The application has three active roles:

- `ceo`: executive dashboard, risks, controls, calendar, categories, users, report templates, notification log
- `cto`: technical overview, change log, releases, access control
- `qa`: QA dashboard, controls, evidence, calendar, policies

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build locally
npm start         # Preview build on 0.0.0.0, used by Railway
```

There is no test runner or linter configured. Use `npm run build` as the main verification command.

To add shadcn/ui components:

```bash
npx shadcn@latest add <component-name>
```

## Environment Setup

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Before running the app against a real Supabase project:

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Create the private Supabase Storage bucket named `evidence`.
3. Create demo users in Supabase Auth.
4. Run `supabase/seed.sql` so profile rows, roles, risks, controls, releases, policies, templates, and demo data are populated.

## Architecture

### Routing

Routes are defined in `src/app/routes.tsx` using `createBrowserRouter` from `react-router`.

- `/login` -> `LoginPage`
- `/` -> `DashboardLayout` with CEO routes
- `/cto` -> `CTOLayout` with CTO routes
- `/qa` -> `QALayout` with QA routes

CEO child routes:

- `/`
- `/risks`
- `/controls`
- `/calendar`
- `/categories`
- `/users`
- `/report-template`
- `/notifications`

CTO child routes:

- `/cto`
- `/cto/changelog`
- `/cto/releases`
- `/cto/access`

QA child routes:

- `/qa`
- `/qa/controls`
- `/qa/evidence`
- `/qa/calendar`
- `/qa/policies`

`ProtectedRoute` (`src/app/components/ProtectedRoute.tsx`) redirects unauthenticated users to `/login` and enforces `profile.role`. `LoginPage` redirects users to the correct role root after sign-in.

### Auth

`src/contexts/AuthContext.tsx` wraps the app and exposes `user`, `profile`, `loading`, `signIn`, and `signOut` through `useAuth()`. `profile` is read from the `profiles` table and is the source of truth for app role checks.

### Supabase Data Access

The Supabase client lives in `src/lib/supabase.ts`. Data fetching is done inline in pages and dialogs with `supabase.from(...)`; there is no separate API layer, query cache, or generated Supabase type client.

Most mutations re-fetch the current page's data after completion. Keep new code consistent with that pattern unless adding a larger data layer intentionally.

### Types

All database-facing interfaces live in `src/lib/types.ts` and use snake_case to match Supabase columns directly. Do not introduce camelCase aliases for DB-mapped fields.

Important interfaces include `Profile`, `RoleOption`, `Risk`, `Control`, `Document`, `DocumentVersion`, `DocumentLink`, `ComplianceEvent`, `Alert`, `Reminder`, `ChangeLog`, `Product`, `Release`, `ReleaseChange`, `RiskCategory`, `ReportTemplate`, `ReportTemplateSection`, `NotificationLogEntry`, and `Policy`.

### UI Components

shadcn/ui components live at `src/app/components/ui/`, not the default `src/components/ui/` path.

- `cn()` is at `src/app/components/ui/utils.ts`.
- `components.json` maps `"ui"` to `@/app/components/ui` and `"utils"` to `@/app/components/ui/utils`.
- Existing components import UI helpers via local relative paths when already following that style.

The app also uses Tailwind CSS v4, Lucide React icons, Recharts, Sonner, `docx`, `jspdf`, `react-dnd`, and selected MUI packages.

### Sidebar Registry

Sidebar customization is powered by `useSidebarConfig` (`src/app/hooks/useSidebarConfig.ts`) and `SidebarEditor`.

The full page registry lives in `src/app/components/allPages.tsx`. Add a new page there if it should appear in a role's configurable sidebar.

Sidebar configuration is stored in `localStorage` under:

```text
sidebar_v2_{view}_{userId}
```

### Shared Pages

Some pages are mounted in more than one role tree:

- `ControlManagement` is used by CEO and QA.
- `ComplianceCalendar` is used by CEO and QA.

Check both contexts before changing shared pages.

### Reports, Exports, and Evidence

- `src/app/components/AuditReportGenerator.tsx` creates DOCX audit reports using `docx`.
- `src/app/pages/ReportTemplateEditor.tsx` manages reusable report template sections.
- `src/app/utils/exportUtils.ts` provides CSV, JSON, and PDF helpers. Some export helpers still import legacy mock data for dashboard-level exports.
- Evidence files are stored in the private `evidence` bucket and linked through `documents`, `document_versions`, and `document_links`.

## Database Notes

The schema currently defines these public tables:

`profiles`, `roles`, `risks`, `controls`, `risk_categories`, `risk_controls`, `documents`, `document_versions`, `document_links`, `compliance_events`, `alerts`, `notification_log`, `reminders`, `change_logs`, `products`, `releases`, `release_changes`, `policies`, `report_templates`, `report_template_sections`.

All tables have Row Level Security enabled. Most tables allow full access to authenticated users. `reminders` is scoped to the owning user. The `evidence` storage bucket requires authenticated access.

## Implementation Conventions

- Keep database field names snake_case throughout React state, form payloads, and TypeScript interfaces.
- When creating new risk/control IDs, use the helper pattern in `src/app/utils/riskUtils.ts` to increment IDs such as `R001` and `C001`.
- Prefer existing page/dialog patterns over adding a new abstraction for one-off behavior.
- Do not commit `.env.local`, Supabase credentials, or uploaded evidence files.
- Treat `src/app/data/mockData.ts` as legacy/demo support. Prefer Supabase-backed data for active features.
