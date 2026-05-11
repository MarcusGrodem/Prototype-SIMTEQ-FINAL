import { Link, useLocation } from 'react-router'
import { BarChart2, Settings2, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { isAppRole } from '../utils/roleAccess'

const VIEWS = [
  { label: 'CEO', description: 'Executive', href: '/', icon: BarChart2, accent: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { label: 'CTO', description: 'Technical', href: '/cto', icon: Settings2, accent: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  { label: 'QA', description: 'Quality assurance', href: '/qa', icon: ClipboardCheck, accent: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
]

function currentView(pathname: string) {
  if (pathname.startsWith('/cto')) return '/cto'
  if (pathname.startsWith('/qa')) return '/qa'
  return '/'
}

export function ViewSwitcher() {
  const location = useLocation()
  const active = currentView(location.pathname)
  const { profile } = useAuth()
  const visibleViews = isAppRole(profile?.role)
    ? VIEWS.filter(v => {
        if (profile.role === 'ceo') return v.href === '/'
        return v.href === `/${profile.role}`
      })
    : VIEWS.filter(v => v.href === active)

  return (
    <div className="px-3 pb-3">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Switch view</p>
      <div className="flex gap-1">
        {visibleViews.map(v => {
          const isActive = active === v.href
          const Icon = v.icon
          return (
            <Link
              key={v.href}
              to={v.href}
              title={`Open ${v.description} view`}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                isActive
                  ? `${v.bg} ${v.accent} border-current`
                  : 'text-gray-400 border-transparent hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {v.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
