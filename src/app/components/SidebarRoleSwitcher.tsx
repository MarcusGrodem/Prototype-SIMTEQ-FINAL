import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BarChart2, ChevronDown, ClipboardCheck, Settings2, Shield } from 'lucide-react'

type ViewKey = 'ceo' | 'cto' | 'qa'

const VIEWS = [
  { key: 'ceo' as const, label: 'CEO', description: 'Executive', href: '/', icon: BarChart2 },
  { key: 'cto' as const, label: 'CTO', description: 'Technical', href: '/cto', icon: Settings2 },
  { key: 'qa' as const, label: 'QA', description: 'Quality assurance', href: '/qa', icon: ClipboardCheck },
]

interface SidebarRoleSwitcherProps {
  activeView: ViewKey
}

export function SidebarRoleSwitcher({ activeView }: SidebarRoleSwitcherProps) {
  const [open, setOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const current = VIEWS.find(view => view.key === activeView) ?? VIEWS[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative px-4 py-3 border-b border-slate-100" ref={switcherRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Switch view"
        onClick={() => setOpen(isOpen => !isOpen)}
        className="w-full flex items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        title="Switch view"
      >
        <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-slate-50" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 leading-none font-display">ComplianceOS</p>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span className="inline-flex h-5 items-center rounded border border-slate-200 bg-slate-50 px-1.5 text-[10px] font-semibold leading-none text-slate-700">
              {current.label}
            </span>
            <span className="truncate text-[10px] font-medium uppercase text-slate-400">
              {current.description}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-[calc(100%-0.25rem)] z-20 rounded-md border border-slate-200 bg-slate-50 shadow-md overflow-hidden">
          <p className="text-[10px] font-semibold text-slate-400 uppercase px-3 pt-2 pb-1">Switch view</p>
          {VIEWS.map(view => {
            const Icon = view.icon
            const isActive = view.key === activeView

            return (
              <Link
                key={view.href}
                to={view.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{view.label}</span>
                <span className="ml-auto text-xs text-slate-400">{view.description}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
