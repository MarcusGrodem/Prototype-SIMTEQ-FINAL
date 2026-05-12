import {
  LayoutDashboard, AlertTriangle, Shield, Calendar,
  GitCommit, Package, Users, FileText, BookOpen,
  Tag, Bell, FileEdit, CalendarDays, ClipboardCheck, ShieldAlert, Gauge,
  Cog, Wrench, Table2, FileQuestion, FileSignature, Upload, Building2, ListChecks
} from 'lucide-react'

export type ViewKey = 'CEO' | 'CTO' | 'QA'

export interface GroupDef {
  key: string
  label: string
  view: ViewKey
  icon: React.ComponentType<{ className?: string }>
}

export interface PageDef {
  key: string
  name: string
  href: string
  view: ViewKey
  icon: React.ComponentType<{ className?: string }>
  group: string                    // GroupDef.key — every page belongs to exactly one group
}

// ─── Group registry ──────────────────────────────────────────────────────────
//
// Sidebars are organised into a small number of groups per role.
// Single-page groups render as a flat link; multi-page groups render as a
// collapsible section.

export const GROUPS: GroupDef[] = [
  // CEO
  { key: 'grp_ceo_dashboard',  label: 'Dashboard',         view: 'CEO', icon: LayoutDashboard },
  { key: 'grp_ceo_compliance', label: 'Controls & Risks',  view: 'CEO', icon: Shield },
  { key: 'grp_ceo_audit',      label: 'Evidence & Audit',  view: 'CEO', icon: ClipboardCheck },
  { key: 'grp_ceo_governance', label: 'Governance',        view: 'CEO', icon: Cog },

  // CTO
  { key: 'grp_cto_dashboard',    label: 'Dashboard',            view: 'CTO', icon: LayoutDashboard },
  { key: 'grp_cto_compliance',   label: 'Technical Compliance', view: 'CTO', icon: Shield },
  { key: 'grp_cto_engineering',  label: 'Engineering',          view: 'CTO', icon: Wrench },

  // QA
  { key: 'grp_qa_dashboard',  label: 'Dashboard',        view: 'QA', icon: LayoutDashboard },
  { key: 'grp_qa_compliance', label: 'Compliance',       view: 'QA', icon: Shield },
  { key: 'grp_qa_audit',      label: 'Evidence & Audit', view: 'QA', icon: ClipboardCheck },
]

export const GROUP_BY_KEY = Object.fromEntries(GROUPS.map(g => [g.key, g])) as Record<string, GroupDef>

// ─── Page registry ───────────────────────────────────────────────────────────

export const ALL_PAGES: PageDef[] = [
  // CEO · Dashboard
  { key: 'ceo_dashboard',       name: 'Overview',          href: '/',                 view: 'CEO', icon: LayoutDashboard, group: 'grp_ceo_dashboard'  },
  { key: 'ceo_readiness',       name: 'Type 2 Readiness',  href: '/readiness',        view: 'CEO', icon: Gauge,           group: 'grp_ceo_dashboard'  },

  // CEO · Controls & Risks
  { key: 'ceo_controls',        name: 'Controls',          href: '/controls',         view: 'CEO', icon: Shield,          group: 'grp_ceo_compliance' },
  { key: 'ceo_risks',           name: 'Risks',             href: '/risks',            view: 'CEO', icon: AlertTriangle,   group: 'grp_ceo_compliance' },

  // CEO · Evidence & Audit
  { key: 'ceo_audit_period',    name: 'Audit Periods',     href: '/audit-period',     view: 'CEO', icon: CalendarDays,    group: 'grp_ceo_audit'      },
  { key: 'ceo_evidence_review', name: 'Evidence Review',   href: '/evidence-review',  view: 'CEO', icon: ClipboardCheck,  group: 'grp_ceo_audit'      },
  { key: 'ceo_deviations',      name: 'Deviations',        href: '/deviations',       view: 'CEO', icon: ShieldAlert,     group: 'grp_ceo_audit'      },
  { key: 'ceo_auditor_requests',name: 'Auditor Requests',  href: '/auditor-requests', view: 'CEO', icon: FileQuestion,     group: 'grp_ceo_audit'      },
  { key: 'ceo_period_end',      name: 'Period End',        href: '/period-end',       view: 'CEO', icon: FileSignature,   group: 'grp_ceo_audit'      },

  // CEO · Governance
  { key: 'ceo_users',           name: 'Users',             href: '/users',            view: 'CEO', icon: Users,           group: 'grp_ceo_governance' },

  // CTO · Dashboard
  { key: 'cto_overview',  name: 'Overview',       href: '/cto',           view: 'CTO', icon: LayoutDashboard, group: 'grp_cto_dashboard'   },

  // CTO · Technical Compliance
  { key: 'cto_controls',  name: 'Controls',       href: '/cto/controls',  view: 'CTO', icon: Shield,          group: 'grp_cto_compliance'  },
  { key: 'cto_evidence',  name: 'Evidence',       href: '/cto/evidence',  view: 'CTO', icon: FileText,        group: 'grp_cto_compliance'  },
  { key: 'cto_calendar',  name: 'Calendar',       href: '/cto/calendar',  view: 'CTO', icon: Calendar,        group: 'grp_cto_compliance'  },

  // CTO · Engineering
  { key: 'cto_changelog', name: 'Change Log',     href: '/cto/changelog', view: 'CTO', icon: GitCommit,       group: 'grp_cto_engineering' },
  { key: 'cto_releases',  name: 'Releases',       href: '/cto/releases',  view: 'CTO', icon: Package,         group: 'grp_cto_engineering' },
  { key: 'cto_access',    name: 'Access',         href: '/cto/access',    view: 'CTO', icon: Users,           group: 'grp_cto_engineering' },

  // QA · Dashboard
  { key: 'qa_overview',   name: 'Overview',       href: '/qa',            view: 'QA',  icon: LayoutDashboard, group: 'grp_qa_dashboard'  },

  // QA · Compliance
  { key: 'qa_controls',   name: 'Controls',       href: '/qa/controls',   view: 'QA',  icon: Shield,          group: 'grp_qa_compliance' },
  { key: 'qa_rcm',        name: 'RCM',            href: '/qa/rcm',        view: 'QA',  icon: Table2,          group: 'grp_qa_compliance' },
  { key: 'qa_categories', name: 'Categories',     href: '/qa/categories', view: 'QA',  icon: Tag,             group: 'grp_qa_compliance' },
  { key: 'qa_calendar',   name: 'Calendar',       href: '/qa/calendar',   view: 'QA',  icon: Calendar,        group: 'grp_qa_compliance' },
  { key: 'qa_policies',   name: 'Policies',       href: '/qa/policies',   view: 'QA',  icon: BookOpen,        group: 'grp_qa_compliance' },

  // QA · Evidence & Audit
  { key: 'qa_evidence',   name: 'Evidence',       href: '/qa/evidence',   view: 'QA',  icon: FileText,        group: 'grp_qa_audit' },
  { key: 'qa_audit_period',    name: 'Audit Periods',    href: '/qa/audit-period',    view: 'QA', icon: CalendarDays,   group: 'grp_qa_audit' },
  { key: 'qa_evidence_review', name: 'Evidence Review',  href: '/qa/evidence-review', view: 'QA', icon: ClipboardCheck, group: 'grp_qa_audit' },
  { key: 'qa_deviations',      name: 'Deviations',       href: '/qa/deviations',      view: 'QA', icon: ShieldAlert,    group: 'grp_qa_audit' },
  { key: 'qa_auditor_requests',name: 'Auditor Requests', href: '/qa/auditor-requests',view: 'QA', icon: FileQuestion,    group: 'grp_qa_audit' },
  { key: 'qa_subservice_orgs', name: 'Subservice Orgs',  href: '/qa/subservice-orgs', view: 'QA', icon: Building2,       group: 'grp_qa_audit' },
  { key: 'qa_cuecs',           name: 'CUECs',            href: '/qa/cuecs',           view: 'QA', icon: ListChecks,      group: 'grp_qa_audit' },
  { key: 'qa_data_import',     name: 'Data Import',      href: '/qa/data-import',     view: 'QA', icon: Upload,          group: 'grp_qa_audit' },
  { key: 'qa_report_tpl',      name: 'Report Template',  href: '/qa/report-template', view: 'QA', icon: FileEdit,        group: 'grp_qa_audit' },
  { key: 'qa_notifications',   name: 'Notifications',    href: '/qa/notifications',   view: 'QA', icon: Bell,            group: 'grp_qa_audit' },
]

export const PAGE_BY_KEY = Object.fromEntries(ALL_PAGES.map(p => [p.key, p])) as Record<string, PageDef>

// Default visible-by-role: every page in the role is visible by default.
// Order follows ALL_PAGES declaration order (which already groups them logically).
export const VIEW_DEFAULTS: Record<string, string[]> = {
  ceo: ALL_PAGES.filter(p => p.view === 'CEO').map(p => p.key),
  cto: ALL_PAGES.filter(p => p.view === 'CTO').map(p => p.key),
  qa:  ALL_PAGES.filter(p => p.view === 'QA').map(p => p.key),
}

export const VIEW_ACCENT: Record<string, string> = {
  CEO: 'text-blue-600 bg-blue-50 border-blue-200',
  CTO: 'text-blue-700 bg-blue-50 border-blue-200',
  QA:  'text-emerald-600 bg-emerald-50 border-emerald-200',
}

// Helper: groups + their pages (preserving an explicit page order), filtered to a view.
export function buildSidebarTree(view: ViewKey, orderedPages: PageDef[]) {
  return GROUPS
    .filter(g => g.view === view)
    .map(g => ({ group: g, pages: orderedPages.filter(p => p.group === g.key) }))
    .filter(g => g.pages.length > 0)
}
