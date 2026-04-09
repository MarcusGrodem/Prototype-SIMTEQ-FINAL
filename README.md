
# ISAE 3402 Compliance Dashboard – Prototype 1 (MADS)

A role-based compliance management dashboard prototype for ISAE 3402 Type II audit readiness. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

The original Figma design is available at: https://www.figma.com/design/zlyjZheSoVBlaL7vwmIsYB/Prototype-1---MADS

---

## Features

- **CEO view** – executive dashboard metrics, risk register with filters and CSV export, compliance calendar with year navigation
- **CTO view** – IT change log, release management, user/access control
- **QA view** – QA dashboard with charts, internal control management, evidence bank with file upload and version history, ISO 27001 policy inventory
- **Reminders** – per-user email reminder configuration for control due dates
- **Real-time data** – all data loaded from Supabase (PostgreSQL), with live insert/update/delete

---

## Tech stack

| | |
|---|---|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Charts | Recharts |
| Notifications | Sonner |
| Icons | Lucide React |

---

## Quick start

### 1. Clone and install

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New project.

### 3. Run the database schema

In the Supabase SQL Editor, paste and run the contents of `supabase/schema.sql`.

This creates all 13 tables, RLS policies, and triggers.

### 4. Create the storage bucket

In Supabase Storage, create a bucket named `evidence` (private). The schema already adds the storage policies.

### 5. Seed the database

In the SQL Editor, paste and run `supabase/seed.sql`.

This inserts 13 risks, 53 controls, compliance events, alerts, change logs, releases, and policies.

### 6. Create demo users

In Supabase → Authentication → Users, add the following users with password `demo1234`:

| Email | Role (set after creation) |
|---|---|
| `ceo@simteq.no` | ceo |
| `cto@simteq.no` | cto |
| `qa@simteq.no` | qa |
| `qa2@simteq.no` | qa |
| `auditor@simteq.no` | ceo |

After creating each user, run the UPDATE statements at the top of `seed.sql` to set names, departments, and roles on the `profiles` table.

### 7. Configure environment variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in Supabase → Settings → API.

### 8. Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and log in with any demo user.

---

## Role-based access

| Role | Dashboard URL | Description |
|---|---|---|
| `ceo` | `/dashboard` | Executive overview, risk register, compliance calendar |
| `cto` | `/cto/dashboard` | Change log, releases, access control |
| `qa` | `/qa/dashboard` | Controls, evidence, policies |

After login the app redirects each user to their role's dashboard automatically. `ProtectedRoute` blocks access to wrong-role pages.

---

## Project structure

```
src/
  app/
    components/     Shared dialogs and layout components
      ui/           Primitive UI (Button, Dialog, Badge, etc.)
    pages/
      cto/          CTO pages
      qa/           QA pages
    utils/          CSV export helpers
  contexts/
    AuthContext.tsx Supabase auth + profile state
  lib/
    supabase.ts     Supabase client
    types.ts        TypeScript interfaces (snake_case, matches DB)
supabase/
  schema.sql        Database schema (run first)
  seed.sql          Seed / demo data (run second)
```

---

## Environment variables reference

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |

Never commit `.env.local` to version control.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
