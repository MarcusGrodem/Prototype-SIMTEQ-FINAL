import { Link, useLocation } from 'react-router'
import { ChevronDown } from 'lucide-react'
import { buildSidebarTree, PageDef, ViewKey } from './allPages'
import { useSidebarGroups } from '../hooks/useSidebarGroups'

interface Props {
  view: ViewKey
  userId: string | undefined
  pages: PageDef[]                  // already filtered to visible + ordered
}

export function SidebarNav({ view, userId, pages }: Props) {
  const location = useLocation()
  const tree = buildSidebarTree(view, pages)
  const { isExpanded, toggle } = useSidebarGroups(view.toLowerCase() as 'ceo' | 'cto' | 'qa', userId)

  return (
    <nav className="p-3 space-y-3">
      {tree.map(({ group, pages: groupPages }) => {
        const containsActive = groupPages.some(p => p.href === location.pathname)

        // Single-page group: render as a flat link without a header.
        if (groupPages.length === 1) {
          return (
            <div key={group.key} className="space-y-0.5">
              <NavItem page={groupPages[0]} active={groupPages[0].href === location.pathname} />
            </div>
          )
        }

        const open = containsActive || isExpanded(group.key, true)
        const GroupIcon = group.icon

        return (
          <div key={group.key} className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                containsActive ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-expanded={open}
              title={open ? `Collapse ${group.label}` : `Expand ${group.label}`}
            >
              <GroupIcon className="w-3 h-3 flex-shrink-0 opacity-70" />
              <span className="flex-1 text-left truncate">{group.label}</span>
              <ChevronDown
                className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
              />
            </button>
            {open && (
              <div className="space-y-0.5 pl-1">
                {groupPages.map(p => (
                  <NavItem key={p.key} page={p} active={p.href === location.pathname} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function NavItem({ page, active }: { page: PageDef; active: boolean }) {
  const Icon = page.icon
  return (
    <Link
      to={page.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-slate-100 text-slate-900'
          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{page.name}</span>
    </Link>
  )
}
