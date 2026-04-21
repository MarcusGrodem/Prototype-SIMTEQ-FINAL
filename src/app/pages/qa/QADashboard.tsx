import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Shield, FileText, BookOpen, CheckCircle2, Clock, AlertCircle, Plus, Upload } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../../lib/supabase'
import { Control, Document, Policy } from '../../../lib/types'
import { useNavigate } from 'react-router'
import { StatusBadge } from '../../components/StatusBadge'

export function QADashboard() {
  const [controls, setControls] = useState<Control[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [cRes, dRes, pRes] = await Promise.all([
      supabase.from('controls').select('*').order('next_due', { ascending: true }),
      supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('policies').select('*').eq('status', 'Active')
    ])
    if (cRes.data) setControls(cRes.data)
    if (dRes.data) setDocuments(dRes.data)
    if (pRes.data) setPolicies(pRes.data)
    setLoading(false)
  }

  const completed = controls.filter(c => c.status === 'Completed').length
  const pending = controls.filter(c => c.status === 'Pending').length
  const overdue = controls.filter(c => c.status === 'Overdue').length

  const chartData = [
    { name: 'Completed', value: completed, fill: '#16a34a' },
    { name: 'Pending', value: pending, fill: '#ca8a04' },
    { name: 'Overdue', value: overdue, fill: '#dc2626' }
  ]

  const upcomingControls = controls
    .filter(c => c.status !== 'Completed' && c.next_due)
    .slice(0, 5)

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
        <div className="max-w-7xl mx-auto">
          <h1 className="text-base font-semibold text-slate-900 leading-none">QA Overview</h1>
          <p className="text-xs text-slate-400 mt-1.5">Reporting period: {period}</p>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-5 border-slate-200 border-l-[3px] border-l-slate-400 shadow-none rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Controls</p>
              <Shield className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{controls.length}</p>
            <p className="text-xs text-slate-400 mt-3">in register</p>
          </Card>
          <Card className="p-5 border-slate-200 border-l-[3px] border-l-emerald-500 shadow-none rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Completed</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{completed}</p>
            <p className="text-xs text-emerald-600 mt-3 font-medium">{controls.length > 0 ? Math.round(completed / controls.length * 100) : 0}% completion rate</p>
          </Card>
          <Card className="p-5 border-slate-200 border-l-[3px] border-l-sky-500 shadow-none rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Evidence Docs</p>
              <FileText className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{documents.length}</p>
            <p className="text-xs text-slate-400 mt-3">uploaded</p>
          </Card>
          <Card className="p-5 border-slate-200 border-l-[3px] border-l-amber-500 shadow-none rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Policies</p>
              <BookOpen className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2">{policies.length}</p>
            <p className="text-xs text-slate-400 mt-3">in policy library</p>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Controls Chart */}
          <Card className="border-slate-200 shadow-none">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Controls by Status</h2>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <rect key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="border-slate-200 shadow-none">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Upcoming Deadlines</h2>
            </div>
            <div className="p-3">
              {upcomingControls.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No upcoming controls</p>
              ) : upcomingControls.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Due: {c.next_due ?? 'N/A'} · {c.owner_name}</p>
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Evidence */}
        <Card className="border-slate-200 shadow-none">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Recent Evidence Uploads</h2>
            <a href="/qa/evidence" className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors">View all</a>
          </div>
          <div className="p-3">
            {documents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No documents uploaded yet</p>
            ) : documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{doc.name}</p>
                    <p className="text-xs text-slate-400">By {doc.uploaded_by_name} · v{doc.current_version}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 tabular-nums">{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200 shadow-none">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="px-6 py-4 flex gap-3">
            <Button onClick={() => navigate('/qa/controls')} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 cursor-pointer">
              <Plus className="w-4 h-4" />
              Add Control
            </Button>
            <Button variant="outline" onClick={() => navigate('/qa/evidence')} className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload Evidence
            </Button>
            <Button variant="outline" onClick={() => navigate('/qa/policies')} className="border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 cursor-pointer">
              <BookOpen className="w-4 h-4" />
              Add Policy
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
