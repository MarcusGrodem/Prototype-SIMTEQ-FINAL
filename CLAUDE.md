# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173
npm run build     # Production build to dist/
npm run preview   # Preview production build
```

There is no test runner or linter configured.

To add shadcn/ui components:
```bash
npx shadcn@latest add <component-name>
```

## Environment setup

Create `.env.local` in the project root:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Before running, the Supabase project needs `supabase/schema.sql` and `supabase/seed.sql` executed in order via the Supabase SQL Editor, plus demo users created in Supabase Auth.

## Architecture

### Role-based routing

The app has three roles — `ceo`, `cto`, `qa` — each with its own layout and route tree:

- `/` → `DashboardLayout` (CEO) — requires role `ceo`
- `/cto` → `CTOLayout` — requires role `cto`
- `/qa` → `QALayout` — requires role `qa`

`ProtectedRoute` (`src/app/components/ProtectedRoute.tsx`) redirects unauthenticated users to `/login`. Role enforcement is done by checking `profile.role` from `AuthContext`. After sign-in, `LoginPage` reads the profile and redirects to the correct dashboard.

### Auth context

`src/contexts/AuthContext.tsx` wraps the app and exposes `user` (Supabase auth user), `profile` (row from `profiles` table with `role` field), `loading`, `signIn`, and `signOut` via `useAuth()`.

### Supabase data access

All data fetching is done inline within page components using the `supabase` client from `src/lib/supabase.ts`. There is no separate data layer or query cache. Pages fetch on mount and after mutations.

### TypeScript types

All interfaces are in `src/lib/types.ts` and use **snake_case** to match Supabase column names directly. Never use camelCase for DB-mapped fields.

### Sidebar customization

Each layout uses `useSidebarConfig` (`src/app/hooks/useSidebarConfig.ts`) to let users reorder and show/hide sidebar items. Configuration is persisted in `localStorage` keyed by `sidebar_v2_{view}_{userId}`. The full page registry lives in `src/app/components/allPages.tsx` — add new pages there to make them available in the sidebar editor.

### UI components

shadcn/ui components live at `src/app/components/ui/` (non-standard path). The `cn()` utility is at `src/app/components/ui/utils.ts`. Components import it via relative path (`./utils`), not `@/lib/utils`. `components.json` is configured with `"ui": "@/app/components/ui"` and `"utils": "@/app/components/ui/utils"`.

### Shared pages

`ControlManagement` (`src/app/pages/ControlManagement.tsx`) and `ComplianceCalendar` are mounted under both the CEO and QA route trees — check both usages before modifying them.

### Export / reporting

`src/app/utils/exportUtils.ts` provides CSV/JSON/PDF export. `src/app/components/AuditReportGenerator.tsx` generates ISAE 3402 audit reports as DOCX using the `docx` package.
