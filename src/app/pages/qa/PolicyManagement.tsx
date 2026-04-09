import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../../components/ui/dialog'
import { Search, Filter, Download, Plus, ChevronDown, BookOpen } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Policy } from '../../../lib/types'
import { downloadCSV } from '../../utils/exportUtils'
import { toast } from 'sonner'
import { useAuth } from '../../../contexts/AuthContext'

const STATUS_OPTIONS = ['Active', 'Draft', 'Under Review', 'Archived'] as const

const statusColor = (s: string) => {
  switch (s) {
    case 'Active': return 'bg-green-100 text-green-700'
    case 'Draft': return 'bg-yellow-100 text-yellow-700'
    case 'Under Review': return 'bg-blue-100 text-blue-700'
    case 'Archived': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export function PolicyManagement() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Policy | null>(null)
  const { profile } = useAuth()

  const emptyForm = {
    title: '',
    category: '',
    description: '',
    version: '1.0',
    status: 'Draft' as typeof STATUS_OPTIONS[number],
    owner_name: '',
    last_reviewed: '',
    next_review: '',
    related_control_id: ''
  }

  const [form, setForm] = useState(emptyForm)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load policies')
    else setPolicies(data || [])
    setLoading(false)
  }

  const filtered = policies.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.owner_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus.length === 0 || filterStatus.includes(p.status)
    return matchSearch && matchStatus
  })

  const handleSave = async () => {
    if (!form.title || !form.category || !form.owner_name) {
      toast.error('Title, category, and owner are required')
      return
    }

    if (editItem) {
      const { error } = await supabase.from('policies').update({
        title: form.title,
        category: form.category,
        description: form.description || null,
        version: form.version,
        status: form.status,
        owner_name: form.owner_name,
        last_reviewed: form.last_reviewed || null,
        next_review: form.next_review || null,
        related_control_id: form.related_control_id || null,
        updated_at: new Date().toISOString()
      }).eq('id', editItem.id)
      if (error) { toast.error('Failed to update policy'); return }
      toast.success('Policy updated')
    } else {
      const { error } = await supabase.from('policies').insert({
        title: form.title,
        category: form.category,
        description: form.description || null,
        version: form.version,
        status: form.status,
        owner_name: form.owner_name || profile?.full_name || 'Unknown',
        last_reviewed: form.last_reviewed || null,
        next_review: form.next_review || null,
        related_control_id: form.related_control_id || null
      })
      if (error) { toast.error('Failed to create policy'); return }
      toast.success('Policy created')
    }

    setAddOpen(false)
    setEditItem(null)
    setForm(emptyForm)
    loadData()
  }

  const openEdit = (p: Policy) => {
    setEditItem(p)
    setForm({
      title: p.title,
      category: p.category,
      description: p.description ?? '',
      version: p.version,
      status: p.status,
      owner_name: p.owner_name,
      last_reviewed: p.last_reviewed ?? '',
      next_review: p.next_review ?? '',
      related_control_id: p.related_control_id ?? ''
    })
    setAddOpen(true)
  }

  const handleExport = () => {
    downloadCSV(filtered.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category,
      version: p.version,
      status: p.status,
      owner: p.owner_name,
      last_reviewed: p.last_reviewed ?? '',
      next_review: p.next_review ?? '',
      related_control: p.related_control_id ?? ''
    })), 'policies.csv')
  }

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Policy Management</h1>
          <p className="text-sm text-gray-500 mt-1">ISO 27001 policy library and lifecycle management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => { setEditItem(null); setForm(emptyForm); setAddOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Policy
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {STATUS_OPTIONS.map(s => (
          <Card key={s} className="p-4">
            <p className="text-sm text-gray-500">{s}</p>
            <p className={`text-2xl font-semibold mt-1 ${
              s === 'Active' ? 'text-green-600' :
              s === 'Draft' ? 'text-yellow-600' :
              s === 'Under Review' ? 'text-blue-600' : 'text-gray-600'
            }`}>
              {policies.filter(p => p.status === s).length}
            </p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>
        {filterOpen && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-gray-700 mb-2">Status</p>
            <div className="flex flex-wrap gap-3">
              {STATUS_OPTIONS.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filterStatus.includes(s)} onChange={() => toggleFilter(filterStatus, s, setFilterStatus)} className="rounded" />
                  <span className="text-sm text-gray-700">{s}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4 text-sm font-medium text-gray-700">Title</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Category</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Version</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Owner</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Last Reviewed</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Next Review</th>
                <th className="text-left p-4 text-sm font-medium text-gray-700">Control</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No policies found</p>
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(p)}>
                  <td className="p-4">
                    <p className="text-sm font-medium text-gray-900">{p.title}</p>
                    {p.description && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{p.description}</p>}
                  </td>
                  <td className="p-4"><Badge variant="outline" className="text-xs">{p.category}</Badge></td>
                  <td className="p-4"><span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">v{p.version}</span></td>
                  <td className="p-4"><Badge className={`text-xs ${statusColor(p.status)}`}>{p.status}</Badge></td>
                  <td className="p-4"><span className="text-sm text-gray-700">{p.owner_name}</span></td>
                  <td className="p-4"><span className="text-sm text-gray-700">{p.last_reviewed ?? '—'}</span></td>
                  <td className="p-4"><span className="text-sm text-gray-700">{p.next_review ?? '—'}</span></td>
                  <td className="p-4">
                    {p.related_control_id ? (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{p.related_control_id}</Badge>
                    ) : '—'}
                  </td>
                  <td className="p-4">
                    <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); openEdit(p) }}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) { setEditItem(null); setForm(emptyForm) } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Policy' : 'Add Policy'}</DialogTitle>
            <DialogDescription>
              {editItem ? 'Update the policy details.' : 'Create a new compliance policy.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Information Security Policy" className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g., Access Control" className="mt-1.5" />
              </div>
              <div>
                <Label>Version</Label>
                <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Policy description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof STATUS_OPTIONS[number] }))} className="mt-1.5 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Owner *</Label>
                <Input value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Owner name" className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Last Reviewed</Label>
                <Input type="date" value={form.last_reviewed} onChange={e => setForm(f => ({ ...f, last_reviewed: e.target.value }))} className="mt-1.5" />
              </div>
              <div>
                <Label>Next Review</Label>
                <Input type="date" value={form.next_review} onChange={e => setForm(f => ({ ...f, next_review: e.target.value }))} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Related Control ID</Label>
              <Input value={form.related_control_id} onChange={e => setForm(f => ({ ...f, related_control_id: e.target.value }))} placeholder="e.g., C001" className="mt-1.5" />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setAddOpen(false); setEditItem(null); setForm(emptyForm) }}>Cancel</Button>
              <Button onClick={handleSave}>{editItem ? 'Save Changes' : 'Add Policy'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
