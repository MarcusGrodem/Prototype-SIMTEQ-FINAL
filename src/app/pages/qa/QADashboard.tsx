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
      <div className="p-8 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">QA Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Control management, evidence, and policies</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Controls</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{controls.length}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-3xl font-semibold text-green-600 mt-2">{completed}</p>
              <p className="text-xs text-gray-500 mt-1">{controls.length > 0 ? Math.round(completed / controls.length * 100) : 0}% rate</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Evidence Docs</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{documents.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Policies</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{policies.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Controls Chart */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Controls by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <rect key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Upcoming Deadlines</h2>
          <div className="space-y-3">
            {upcomingControls.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming controls</p>
            ) : upcomingControls.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Due: {c.next_due ?? 'N/A'} • {c.owner_name}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Evidence */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Evidence Uploads</h2>
          <a href="/qa/evidence" className="text-sm text-emerald-600 hover:text-emerald-700">View all</a>
        </div>
        <div className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
          ) : documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  <p className="text-xs text-gray-500">By {doc.uploaded_by_name} • v{doc.current_version}</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/qa/controls')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" />
            Add Control
          </Button>
          <Button variant="outline" onClick={() => navigate('/qa/evidence')} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Evidence
          </Button>
          <Button variant="outline" onClick={() => navigate('/qa/policies')} className="gap-2">
            <BookOpen className="w-4 h-4" />
            Add Policy
          </Button>
        </div>
      </Card>
    </div>
  )
}
