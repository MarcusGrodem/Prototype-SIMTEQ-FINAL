import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { LogOut, Pencil, X } from 'lucide-react';
import { Toaster } from './ui/sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './ui/button';
import { SidebarEditor } from './SidebarEditor';
import { SidebarRoleSwitcher } from './SidebarRoleSwitcher';
import { useSidebarConfig } from '../hooks/useSidebarConfig';
import { PAGE_BY_KEY } from './allPages';

export function CTOLayout() {
  const location = useLocation()
  const { profile, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)

  const { config, toggleVisible, moveUp, moveDown, reset } = useSidebarConfig('cto', user?.id)

  const visibleNav = config
    .filter(c => c.visible)
    .map(c => PAGE_BY_KEY[c.key])
    .filter(Boolean)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'CT'

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <SidebarRoleSwitcher activeView="cto" />

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {!editing ? (
            <nav className="p-3 space-y-0.5">
              {visibleNav.map(page => {
                const isActive = location.pathname === page.href
                const Icon = page.icon
                return (
                  <Link
                    key={page.key}
                    to={page.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {page.name}
                  </Link>
                )
              })}
            </nav>
          ) : (
            <SidebarEditor
              config={config}
              view="CTO"
              onToggle={toggleVisible}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onReset={reset}
            />
          )}
        </div>

        {/* Customize */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setEditing(e => !e)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              editing
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {editing ? 'Done editing' : 'Customize sidebar'}
          </button>
        </div>

        {/* User */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 rounded-lg px-1 py-1">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-slate-700">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate leading-none">{profile?.full_name ?? 'CTO'}</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">CTO</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0 cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 overflow-auto bg-slate-50 flex flex-col">
        <Outlet />
      </div>
      <Toaster />
    </div>
  )
}
