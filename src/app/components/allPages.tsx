import {
  LayoutDashboard, AlertTriangle, Shield, Calendar,
  GitCommit, Package, Users, FileText, BookOpen,
  Tag, Bell, FileEdit, CalendarDays
} from 'lucide-react'

export interface PageDef {
  key: string
  name: string
  href: string
  view: 'CEO' | 'CTO' | 'QA'
  icon: React.ComponentType<{ className?: string }>
}

export const ALL_PAGES: PageDef[] = [
  // CEO
  { key: 'ceo_dashboard',     name: 'Dashboard',         href: '/',                  view: 'CEO', icon: LayoutDashboard },
  { key: 'ceo_risks',         name: 'Risk Register',     href: '/risks',             view: 'CEO', icon: AlertTriangle },
  { key: 'ceo_controls',      name: 'Controls',          href: '/controls',          view: 'CEO', icon: Shield },
  { key: 'ceo_calendar',      name: 'Calendar',          href: '/calendar',          view: 'CEO', icon: Calendar },
  { key: 'ceo_categories',    name: 'Risk Categories',   href: '/categories',        view: 'CEO', icon: Tag },
  { key: 'ceo_users',         name: 'Users',             href: '/users',             view: 'CEO', icon: Users },
  { key: 'ceo_report_tpl',    name: 'Report Template',   href: '/report-template',   view: 'CEO', icon: FileEdit },
  { key: 'ceo_notifications', name: 'Notification Log',  href: '/notifications',     view: 'CEO', icon: Bell },
  { key: 'ceo_audit_period', name: 'Audit Periods',     href: '/audit-period',      view: 'CEO', icon: CalendarDays },
  // CTO
  { key: 'cto_overview',  name: 'Overview',       href: '/cto',           view: 'CTO', icon: LayoutDashboard },
  { key: 'cto_changelog', name: 'Change Log',     href: '/cto/changelog', view: 'CTO', icon: GitCommit },
  { key: 'cto_releases',  name: 'Releases',       href: '/cto/releases',  view: 'CTO', icon: Package },
  { key: 'cto_access',    name: 'Access Control', href: '/cto/access',    view: 'CTO', icon: Users },
  // QA
  { key: 'qa_overview',   name: 'Overview',       href: '/qa',            view: 'QA',  icon: LayoutDashboard },
  { key: 'qa_controls',   name: 'Controls',       href: '/qa/controls',   view: 'QA',  icon: Shield },
  { key: 'qa_evidence',   name: 'Evidence',       href: '/qa/evidence',   view: 'QA',  icon: FileText },
  { key: 'qa_calendar',   name: 'Calendar',       href: '/qa/calendar',   view: 'QA',  icon: Calendar },
  { key: 'qa_policies',   name: 'Policies',       href: '/qa/policies',   view: 'QA',  icon: BookOpen },
]

export const PAGE_BY_KEY = Object.fromEntries(ALL_PAGES.map(p => [p.key, p]))

export const VIEW_DEFAULTS: Record<string, string[]> = {
  ceo: ['ceo_dashboard', 'ceo_risks', 'ceo_controls', 'ceo_calendar', 'ceo_categories', 'ceo_users', 'ceo_report_tpl', 'ceo_notifications', 'ceo_audit_period'],
  cto: ['cto_overview', 'cto_changelog', 'cto_releases', 'cto_access'],
  qa:  ['qa_overview', 'qa_controls', 'qa_evidence', 'qa_calendar', 'qa_policies'],
}

export const VIEW_ACCENT: Record<string, string> = {
  CEO: 'text-blue-600 bg-blue-50 border-blue-200',
  CTO: 'text-blue-700 bg-blue-50 border-blue-200',
  QA:  'text-emerald-600 bg-emerald-50 border-emerald-200',
}
