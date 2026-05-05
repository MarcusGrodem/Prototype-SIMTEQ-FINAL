import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { GitCommit, Package, AlertTriangle, Clock, Plus, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ChangeLog, Release } from '../../../lib/types'
import { useNavigate } from 'react-router'

const SAMPLE_DATA_URL = 'https://github.com/MarcusGrodem/Prototype-SIMTEQ-FINAL/blob/main/supabase/seed.sql'

export function CTODashboard() {
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [clRes, relRes] = await Promise.all([
      supabase.from('change_logs').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('releases').select('*').order('created_at', { ascending: false }).limit(10)
    ])
    if (clRes.data) setChangeLogs(clRes.data)
    if (relRes.data) setReleases(relRes.data)
    setLoading(false)
  }

  const pendingApprovals = changeLogs.filter(c => c.status === 'Pending Approval').length
  const deployedCount = changeLogs.filter(c => c.status === 'Deployed').length
  const activeReleases = releases.filter(r => r.status === 'In Progress').length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-600'
      case 'Pending Approval': return 'bg-amber-50 text-amber-700'
      case 'Approved': return 'bg-sky-50 text-sky-700'
      case 'Deployed': return 'bg-emerald-50 text-emerald-700'
      case 'Rejected': return 'bg-red-50 text-red-700'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const getReleaseStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'bg-slate-100 text-slate-600'
      case 'In Progress': return 'bg-sky-50 text-sky-700'
      case 'Released': return 'bg-emerald-50 text-emerald-700'
      case 'Rolled Back': return 'bg-red-50 text-red-700'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-96">
        <svg className="animate-spin h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  const now = new Date()
  const period = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col min-h-full">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">CTO Overview</h1>
            <p className="text-xs text-slate-400 mt-2">Reporting period: {period}</p>
          </div>
          <Button size="sm" onClick={() => navigate('/cto/changelog')} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 cursor-pointer">
            <Plus className="w-4 h-4" />
            New Change
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Stats strip — pending approvals is the action metric */}
        <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden divide-x divide-slate-200">
          <button onClick={() => navigate('/cto/changelog')} className="flex-1 px-6 py-7 text-left hover:bg-slate-50 transition-colors cursor-pointer">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Total Changes</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-3">{changeLogs.length}</p>
            <p className="text-xs text-slate-400 mt-3">{deployedCount} deployed</p>
          </button>
          <button onClick={() => navigate('/cto/changelog')} className={`w-2/5 shrink-0 px-8 py-7 text-left hover:bg-slate-50 transition-colors cursor-pointer ${pendingApprovals > 0 ? 'bg-amber-50/40' : ''}`}>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Pending Approval</p>
            <p className={`text-5xl font-bold tabular-nums mt-3 leading-none ${pendingApprovals > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{pendingApprovals}</p>
            <p className={`text-xs mt-4 font-medium ${pendingApprovals > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{pendingApprovals > 0 ? 'awaiting review — action required' : 'all changes approved'}</p>
          </button>
          <button onClick={() => navigate('/cto/releases')} className="flex-1 px-6 py-7 text-left hover:bg-slate-50 transition-colors cursor-pointer">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Total Releases</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-3">{releases.length}</p>
            <p className="text-xs text-slate-400 mt-3">across all products</p>
          </button>
          <button onClick={() => navigate('/cto/releases')} className="flex-1 px-6 py-7 text-left hover:bg-slate-50 transition-colors cursor-pointer">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">In Progress</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-3">{activeReleases}</p>
            <p className="text-xs text-slate-400 mt-3">active releases</p>
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Change Logs */}
          <Card className="border-slate-200 shadow-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Recent Changes</h2>
              <a href="/cto/changelog" className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors">View all</a>
            </div>
            <div className="p-3">
              {changeLogs.slice(0, 5).map(cl => (
                <div key={cl.id} className="flex items-start justify-between px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{cl.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-400">{cl.author_name}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{cl.change_type}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-3 flex-shrink-0 ${getStatusColor(cl.status)}`}>{cl.status}</span>
                </div>
              ))}
              {changeLogs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <p className="text-sm font-medium text-slate-600">No changes logged</p>
                  <p className="text-xs text-slate-400 mt-1">Document system changes to maintain audit traceability.</p>
                  <button onClick={() => navigate('/cto/changelog')} className="mt-3 text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 transition-colors cursor-pointer">
                    Log first change →
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Releases */}
          <Card className="border-slate-200 shadow-none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Recent Releases</h2>
              <a href="/cto/releases" className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors">View all</a>
            </div>
            <div className="p-3">
              {releases.slice(0, 4).map(rel => (
                <div key={rel.id} className="flex items-start justify-between px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono tabular-nums bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{rel.version}</span>
                      <p className="text-sm font-medium text-slate-900 truncate">{rel.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-slate-400">{rel.environment}</span>
                      {rel.release_date && (
                        <>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{new Date(rel.release_date).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-3 flex-shrink-0 ${getReleaseStatusColor(rel.status)}`}>{rel.status}</span>
                </div>
              ))}
              {releases.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <p className="text-sm font-medium text-slate-600">No releases tracked</p>
                  <p className="text-xs text-slate-400 mt-1">Track software releases to link them to controls and evidence.</p>
                  <button onClick={() => navigate('/cto/releases')} className="mt-3 text-xs font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 transition-colors cursor-pointer">
                    Create first release →
                  </button>
                  <a
                    href={SAMPLE_DATA_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900 transition-colors"
                  >
                    Load sample data <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Change Status Breakdown */}
        <Card className="border-slate-200 shadow-none">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Change Status Breakdown</h2>
          </div>
          <div className="p-6 grid grid-cols-5 gap-3">
            {[
              { status: 'Draft', cls: 'bg-slate-100 text-slate-700' },
              { status: 'Pending Approval', cls: 'bg-amber-50 text-amber-800' },
              { status: 'Approved', cls: 'bg-sky-50 text-sky-800' },
              { status: 'Deployed', cls: 'bg-emerald-50 text-emerald-800' },
              { status: 'Rejected', cls: 'bg-red-50 text-red-800' },
            ].map(({ status, cls }) => {
              const count = changeLogs.filter(c => c.status === status).length
              return (
                <div key={status} className={`p-4 rounded-lg text-center ${cls}`}>
                  <p className="text-2xl font-bold tabular-nums">{count}</p>
                  <p className="text-xs font-medium mt-1">{status}</p>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={() => navigate('/cto/changelog')} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 cursor-pointer">
            <GitCommit className="w-4 h-4" />
            Log a Change
          </Button>
          <Button variant="outline" onClick={() => navigate('/cto/releases')} className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 cursor-pointer">
            <Package className="w-4 h-4" />
            New Release
          </Button>
          <Button variant="outline" onClick={() => navigate('/cto/access')} className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 cursor-pointer">
            <CheckCircle2 className="w-4 h-4" />
            Review Access
          </Button>
        </div>
      </div>
    </div>
  )
}
