import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { GitCommit, Package, AlertTriangle, Clock, Plus, CheckCircle2, XCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ChangeLog, Release } from '../../../lib/types'
import { useNavigate } from 'react-router'

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
      case 'Draft': return 'bg-gray-100 text-gray-700'
      case 'Pending Approval': return 'bg-yellow-100 text-yellow-700'
      case 'Approved': return 'bg-blue-100 text-blue-700'
      case 'Deployed': return 'bg-green-100 text-green-700'
      case 'Rejected': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getReleaseStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'bg-gray-100 text-gray-700'
      case 'In Progress': return 'bg-blue-100 text-blue-700'
      case 'Released': return 'bg-green-100 text-green-700'
      case 'Rolled Back': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CTO Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Technical change management and audit trail</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate('/cto/changelog')}>
            <Plus className="w-4 h-4 mr-2" />
            New Change
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Changes</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{changeLogs.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <GitCommit className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-3xl font-semibold text-yellow-600 mt-2">{pendingApprovals}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Releases</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{releases.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-3xl font-semibold text-green-600 mt-2">{activeReleases}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Change Logs */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Changes</h2>
            <a href="/cto/changelog" className="text-sm text-blue-600 hover:text-blue-700">View all</a>
          </div>
          <div className="space-y-3">
            {changeLogs.slice(0, 5).map(cl => (
              <div key={cl.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cl.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{cl.author_name}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{cl.change_type}</span>
                  </div>
                </div>
                <Badge className={`text-xs ml-2 ${getStatusColor(cl.status)}`}>{cl.status}</Badge>
              </div>
            ))}
            {changeLogs.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No changes yet</p>
            )}
          </div>
        </Card>

        {/* Recent Releases */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Releases</h2>
            <a href="/cto/releases" className="text-sm text-blue-600 hover:text-blue-700">View all</a>
          </div>
          <div className="space-y-3">
            {releases.slice(0, 4).map(rel => (
              <div key={rel.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{rel.version}</span>
                    <p className="text-sm font-medium text-gray-900 truncate">{rel.title}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{rel.environment}</span>
                    {rel.release_date && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{new Date(rel.release_date).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <Badge className={`text-xs ml-2 ${getReleaseStatusColor(rel.status)}`}>{rel.status}</Badge>
              </div>
            ))}
            {releases.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No releases yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Change Status Breakdown */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Change Status Breakdown</h2>
        <div className="grid grid-cols-5 gap-4">
          {['Draft', 'Pending Approval', 'Approved', 'Deployed', 'Rejected'].map(status => {
            const count = changeLogs.filter(c => c.status === status).length
            return (
              <div key={status} className={`p-4 rounded-lg text-center ${getStatusColor(status)}`}>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs font-medium mt-1">{status}</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/cto/changelog')} className="gap-2">
            <GitCommit className="w-4 h-4" />
            Log a Change
          </Button>
          <Button variant="outline" onClick={() => navigate('/cto/releases')} className="gap-2">
            <Package className="w-4 h-4" />
            New Release
          </Button>
          <Button variant="outline" onClick={() => navigate('/cto/access')} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Review Access
          </Button>
        </div>
      </Card>
    </div>
  )
}
