import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router';
import { LogOut, Pencil, X, CalendarDays } from 'lucide-react';
import { Toaster } from './ui/sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useAuditPeriod } from '../../contexts/AuditPeriodContext';
import { Button } from './ui/button';
import { SidebarEditor } from './SidebarEditor';
import { SidebarRoleSwitcher } from './SidebarRoleSwitcher';
import { SidebarNav } from './SidebarNav';
import { useSidebarConfig } from '../hooks/useSidebarConfig';
import { PAGE_BY_KEY } from './allPages';

export function DashboardLayout() {
  const { profile, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)

  const { config, toggleVisible, moveUp, moveDown, reset } = useSidebarConfig('ceo', user?.id)
  const { activePeriod } = useAuditPeriod()

  const daysRemaining = activePeriod
    ? Math.max(0, Math.ceil((new Date(activePeriod.end_date).getTime() - Date.now()) / 86400000))
    : null
  const periodProgress = activePeriod
    ? Math.round(
        ((Date.now() - new Date(activePeriod.start_date).getTime()) /
          (new Date(activePeriod.end_date).getTime() - new Date(activePeriod.start_date).getTime())) * 100
      )
    : null

  const visibleNav = config
    .filter(c => c.visible)
    .map(c => PAGE_BY_KEY[c.key])
    .filter(Boolean)

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : 'CE'

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        <SidebarRoleSwitcher activeView="ceo" />

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          {!editing ? (
            <SidebarNav view="CEO" userId={user?.id} pages={visibleNav} />
          ) : (
            <SidebarEditor
              config={config}
              view="CEO"
              onToggle={toggleVisible}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onReset={reset}
            />
          )}
        </div>

        {/* Active audit period indicator */}
        {activePeriod && (
          <Link to="/audit-period" className="mx-3 mb-2 block">
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 hover:bg-green-100 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-green-800 truncate">{activePeriod.name}</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-1 mb-1">
                <div
                  className="bg-green-600 h-1 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, periodProgress ?? 0))}%` }}
                />
              </div>
              <p className="text-xs text-green-600">{daysRemaining}d remaining</p>
            </div>
          </Link>
        )}

        {/* Customize */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setEditing(e => !e)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
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
              <p className="text-sm font-medium text-slate-900 truncate leading-none">{profile?.full_name ?? 'CEO'}</p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">CEO</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0"
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
