# Dummy Version – Build Context for Claude

This file tells Claude how to build a **simplified, single-role version** of the ComplianceOS dashboard.
The dummy version is a school project prototype — keep it clean, readable, and easy to explain.

---

## What to Build

A compliance dashboard for a **single user (CEO role only)**. No login, no multi-role system, no complex tooling.
The app lets a user view and manage **risks** and **controls** in a simple, readable UI.

---

## Tech Stack

| Tool | Version | Notes |
|------|---------|-------|
| React | 18 | Functional components only |
| TypeScript | 5 | Use types for all data structures |
| Vite | 5 | Dev server + build tool |
| Tailwind CSS | 3 | Utility classes for styling |
| React Router | 6 | Client-side routing |
| Supabase JS | 2 | Database client (optional — see below) |

Bootstrap the project with:
```bash
npm create vite@latest compliance-dashboard -- --template react-ts
cd compliance-dashboard
npm install
npm install react-router-dom @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## What NOT to Include

These exist in the full version but must be omitted:

- **No login page or authentication** — app loads directly into the dashboard
- **No CTO or QA views/routes** — CEO only
- **No role-based routing or `ProtectedRoute`**
- **No sidebar customization** (no drag-to-reorder, no show/hide pages)
- **No `useSidebarConfig` hook or `SidebarEditor` component**
- **No audit report generator** (Word/PDF export with ISAE 3402 content)
- **No `ExportDialog`** (CSV/JSON export)
- **No `AuditReportGenerator`** component
- **No `RiskHeatmapDialog`** (skip the heatmap popup)
- **No `CatchUpNotification`** component
- **No alerts or notification system**
- **No `ViewSwitcher`** (role switching between CEO/CTO/QA)
- **No `shadcn/ui`** — use plain HTML elements styled with Tailwind instead
- **No `docx` or `jsPDF` libraries**

---

## App Structure

```
src/
  App.tsx              # Router setup + layout wrapper
  main.tsx             # Entry point
  types.ts             # Risk and Control interfaces
  supabase.ts          # Supabase client (or mock data)
  pages/
    Dashboard.tsx      # Overview with summary stats
    RiskRegister.tsx   # List + add/edit risks
    ControlManagement.tsx  # List controls, mark as done
  components/
    Sidebar.tsx        # Fixed navigation sidebar
    RiskRow.tsx        # Single row in risk table
    ControlRow.tsx     # Single row in control table
    AddRiskForm.tsx    # Simple form to add a new risk
```

---

## Data Model

Use these two TypeScript interfaces. Column names match the Supabase schema exactly (snake_case).

```ts
// types.ts

export interface Risk {
  id: string           // e.g. "R001"
  title: string
  category: string
  likelihood: 'Low' | 'Medium' | 'High'
  impact: 'Low' | 'Medium' | 'High'
  risk_score: number   // 1–9
  owner_name: string
  status: 'Active' | 'Mitigated' | 'Closed'
  created_at: string
}

export interface Control {
  id: string           // e.g. "C001"
  title: string
  category: string
  frequency: 'Monthly' | 'Quarterly' | 'Yearly'
  owner_name: string
  status: 'Completed' | 'Pending' | 'Overdue'
  next_due: string | null
  description: string | null
  created_at: string
}
```

---

## Database (Supabase)

Create a free project at supabase.com. Create a `.env` file:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run this SQL in the Supabase SQL Editor:

```sql
create table risks (
  id text primary key,
  title text not null,
  category text not null,
  likelihood text not null check (likelihood in ('Low','Medium','High')),
  impact text not null check (impact in ('Low','Medium','High')),
  risk_score integer not null,
  owner_name text not null,
  status text not null check (status in ('Active','Mitigated','Closed')),
  description text,
  created_at timestamptz not null default now()
);

create table controls (
  id text primary key,
  title text not null,
  category text not null,
  frequency text not null check (frequency in ('Monthly','Quarterly','Yearly')),
  owner_name text not null,
  status text not null check (status in ('Completed','Pending','Overdue')),
  description text,
  next_due date,
  created_at timestamptz not null default now()
);

-- Disable row level security for simplicity (school project only)
alter table risks disable row level security;
alter table controls disable row level security;
```

Seed with some sample data:
```sql
insert into risks (id, title, category, likelihood, impact, risk_score, owner_name, status) values
('R001', 'Unauthorized data access', 'Information Security', 'High', 'High', 9, 'IT Manager', 'Active'),
('R002', 'System downtime', 'Availability', 'Medium', 'High', 6, 'CTO', 'Monitoring'),
('R003', 'Phishing attack', 'Information Security', 'High', 'Medium', 6, 'IT Manager', 'Active'),
('R004', 'Data backup failure', 'Business Continuity', 'Low', 'High', 3, 'IT Manager', 'Mitigated');

insert into controls (id, title, category, frequency, owner_name, status, next_due) values
('C001', 'Access control review', 'Access Management', 'Quarterly', 'IT Manager', 'Completed', '2026-07-01'),
('C002', 'Backup verification', 'Business Continuity', 'Monthly', 'IT Manager', 'Pending', '2026-04-15'),
('C003', 'Security awareness training', 'Training', 'Yearly', 'HR Manager', 'Overdue', '2026-01-01'),
('C004', 'Vulnerability scanning', 'Information Security', 'Monthly', 'IT Manager', 'Completed', '2026-04-30');
```

---

## Pages to Build

### 1. Dashboard (`/`)

Show summary statistics at the top:
- Total risks, high risks (score ≥ 7), total controls, compliance % (completed / total)

Then show two simple lists below:
- Last 5 risks (title, score, status)
- Last 5 controls (title, status, next due date)

No charts, no heatmaps, no dialogs — just cards with numbers and tables.

### 2. Risk Register (`/risks`)

Show all risks in a table with columns:
`ID | Title | Category | Likelihood | Impact | Score | Owner | Status`

Include:
- A simple form above the table to add a new risk (text inputs + dropdowns)
- A delete button per row
- Color-code the score: red ≥ 7, amber 4–6, green ≤ 3

No edit dialog — keep it simple. If the user needs editing, add a separate edit page at `/risks/:id`.

### 3. Control Management (`/controls`)

Show all controls in a table:
`ID | Title | Category | Frequency | Owner | Status | Next Due`

Include:
- A "Mark as Completed" button per row (updates status in Supabase or local state)
- Color-code status: green = Completed, yellow = Pending, red = Overdue

No add form needed — controls are typically pre-defined in compliance systems.

---

## Sidebar (Fixed, No Customization)

A plain left sidebar with:
- App title: "ComplianceOS"
- Three nav links: Dashboard, Risk Register, Controls
- No user avatar, no logout button, no edit/customize button

```tsx
// components/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom'

const links = [
  { href: '/',        label: 'Dashboard' },
  { href: '/risks',   label: 'Risk Register' },
  { href: '/controls', label: 'Controls' },
]

export function Sidebar() {
  const { pathname } = useLocation()
  return (
    <aside className="w-56 h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">ComplianceOS</p>
      </div>
      <nav className="p-3 space-y-1">
        {links.map(l => (
          <Link
            key={l.href}
            to={l.href}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === l.href
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

---

## Routing (`App.tsx`)

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { RiskRegister } from './pages/RiskRegister'
import { ControlManagement } from './pages/ControlManagement'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/risks" element={<RiskRegister />} />
            <Route path="/controls" element={<ControlManagement />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
```

---

## What Claude Should Produce

When given this file, Claude should build:

1. All files listed under **App Structure** above
2. Tailwind configured in `tailwind.config.js` and imported in `index.css`
3. Supabase client in `supabase.ts` (or mock data if no credentials)
4. Working navigation between the three pages
5. Risk table with add + delete
6. Control table with status toggle
7. Dashboard with four stat cards at the top

The result should be ~8–10 files total. No component libraries, no complex hooks, no auth, no export tools.

---

## What to Tell Claude

Paste this into a new Claude Code session in the new repo:

> "Build a simple compliance dashboard based on the context in DUMMY_VERSION_CONTEXT.md. Use React 18 + TypeScript + Vite + Tailwind CSS. No authentication, no role switching, CEO view only. Three pages: Dashboard, Risk Register, Controls. Use Supabase for data — credentials are in .env. Keep the code simple — this is a school project."
