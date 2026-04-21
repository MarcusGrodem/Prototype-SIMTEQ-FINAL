import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../../components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select'
import { Search, Filter, Download, Plus, X, ChevronDown } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { ChangeLog as ChangeLogType } from '../../../lib/types'
import { downloadCSV } from '../../utils/exportUtils'
import { toast } from 'sonner'
import { useAuth } from '../../../contexts/AuthContext'

const STATUS_OPTIONS = ['Draft', 'Pending Approval', 'Approved', 'Deployed', 'Rejected'] as const
const TYPE_OPTIONS = ['Release', 'Configuration', 'Access', 'Code', 'Infrastructure'] as const
const ENV_OPTIONS = ['Production', 'Staging', 'Development'] as const

const statusColor = (s: string) => {
  switch (s) {
    case 'Draft': return 'bg-slate-100 text-slate-700'
    case 'Pending Approval': return 'bg-yellow-100 text-yellow-700'
    case 'Approved': return 'bg-blue-100 text-blue-700'
    case 'Deployed': return 'bg-green-100 text-green-700'
    case 'Rejected': return 'bg-red-100 text-red-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

export function ChangeLogPage() {
  const [items, setItems] = useState<ChangeLogType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterType, setFilterType] = useState<string[]>([])
  const [filterEnv, setFilterEnv] = useState<string[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<ChangeLogType | null>(null)
  const { profile } = useAuth()

  const [form, setForm] = useState({
    title: '',
    description: '',
    change_type: '' as typeof TYPE_OPTIONS[number] | '',
    environment: '' as typeof ENV_OPTIONS[number] | '',
    approved_by_name: '',
    status: 'Draft' as typeof STATUS_OPTIONS[number],
    related_risk_id: '',
    related_control_id: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('change_logs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Failed to load change logs')
    else setItems(data || [])
    setLoading(false)
  }

  const filtered = items.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.author_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus.length === 0 || filterStatus.includes(i.status)
    const matchType = filterType.length === 0 || filterType.includes(i.change_type)
    const matchEnv = filterEnv.length === 0 || (i.environment && filterEnv.includes(i.environment))
    return matchSearch && matchStatus && matchType && matchEnv
  })

  const handleAdd = async () => {
    if (!form.title || !form.change_type) {
      toast.error('Title and change type are required')
      return
    }
    const { error } = await supabase.from('change_logs').insert({
      title: form.title,
      description: form.description || null,
      change_type: form.change_type,
      environment: form.environment || null,
      author_name: profile?.full_name ?? 'Unknown',
      approved_by_name: form.approved_by_name || null,
      status: form.status,
      related_risk_id: form.related_risk_id || null,
      related_control_id: form.related_control_id || null
    })
    if (error) { toast.error('Failed to add change'); return }
    toast.success('Change logged successfully')
    setAddOpen(false)
    setForm({ title: '', description: '', change_type: '', environment: '', approved_by_name: '', status: 'Draft', related_risk_id: '', related_control_id: '' })
    loadData()
  }

  const updateStatus = async (id: string, status: typeof STATUS_OPTIONS[number]) => {
    const { error } = await supabase.from('change_logs').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Failed to update status'); return }
    toast.success('Status updated')
    loadData()
    setDetailItem(prev => prev ? { ...prev, status } : prev)
  }

  const handleExport = () => {
    downloadCSV(filtered.map(i => ({
      id: i.id,
      title: i.title,
      change_type: i.change_type,
      environment: i.environment ?? '',
      author: i.author_name,
      approved_by: i.approved_by_name ?? '',
      status: i.status,
      related_risk: i.related_risk_id ?? '',
      related_control: i.related_control_id ?? '',
      created_at: i.created_at
    })), 'change_logs.csv')
  }

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Change Log</h1>
            <p className="text-xs text-slate-400 mt-2">Audit trail of all technical changes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Change
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search changes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter className="w-4 h-4 mr-2" />
            Filter
            {(filterStatus.length + filterType.length + filterEnv.length) > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white text-xs">
                {filterStatus.length + filterType.length + filterEnv.length}
              </Badge>
            )}
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </div>
        {filterOpen && (
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-700 mb-2">Status</p>
              {STATUS_OPTIONS.map(s => (
                <label key={s} className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="checkbox" checked={filterStatus.includes(s)} onChange={() => toggleFilter(filterStatus, s, setFilterStatus)} className="rounded" />
                  <span className="text-sm text-slate-700">{s}</span>
                </label>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 mb-2">Type</p>
              {TYPE_OPTIONS.map(t => (
                <label key={t} className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="checkbox" checked={filterType.includes(t)} onChange={() => toggleFilter(filterType, t, setFilterType)} className="rounded" />
                  <span className="text-sm text-slate-700">{t}</span>
                </label>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 mb-2">Environment</p>
              {ENV_OPTIONS.map(e => (
                <label key={e} className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input type="checkbox" checked={filterEnv.includes(e)} onChange={() => toggleFilter(filterEnv, e, setFilterEnv)} className="rounded" />
                  <span className="text-sm text-slate-700">{e}</span>
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
              <tr className="border-b bg-slate-50">
                <th className="text-left p-4 text-sm font-medium text-slate-700">Title</th>
                <th className="text-left p-4 text-sm font-medium text-slate-700">Type</th>
                <th className="text-left p-4 text-sm font-medium text-slate-700">Environment</th>
                <th className="text-left p-4 text-sm font-medium text-slate-700">Author</th>
                <th className="text-left p-4 text-sm font-medium text-slate-700">Status</th>
                <th className="text-left p-4 text-sm font-medium text-slate-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center">
                  <p className="text-sm font-medium text-slate-600">No changes found</p>
                  <p className="text-xs text-slate-400 mt-1">Log IT changes to maintain a traceable audit record.</p>
                </td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setDetailItem(item)}>
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      {item.description && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{item.description}</p>}
                    </div>
                  </td>
                  <td className="p-4"><Badge variant="outline" className="text-xs">{item.change_type}</Badge></td>
                  <td className="p-4"><span className="text-sm text-slate-700">{item.environment ?? '—'}</span></td>
                  <td className="p-4"><span className="text-sm text-slate-700">{item.author_name}</span></td>
                  <td className="p-4"><Badge className={`text-xs ${statusColor(item.status)}`}>{item.status}</Badge></td>
                  <td className="p-4"><span className="text-sm text-slate-700">{new Date(item.created_at).toLocaleDateString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Change</DialogTitle>
            <DialogDescription>Log a new technical change for audit trail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Deploy v2.1.0 to production" className="mt-1.5" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the change..." className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type *</Label>
                <select value={form.change_type} onChange={e => setForm(f => ({ ...f, change_type: e.target.value as typeof TYPE_OPTIONS[number] }))} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select type...</option>
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Environment</Label>
                <select value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value as typeof ENV_OPTIONS[number] }))} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select env...</option>
                  {ENV_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof STATUS_OPTIONS[number] }))} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Approved By</Label>
                <Input value={form.approved_by_name} onChange={e => setForm(f => ({ ...f, approved_by_name: e.target.value }))} placeholder="Name" className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Related Risk ID</Label>
                <Input value={form.related_risk_id} onChange={e => setForm(f => ({ ...f, related_risk_id: e.target.value }))} placeholder="e.g., R001" className="mt-1.5" />
              </div>
              <div>
                <Label>Related Control ID</Label>
                <Input value={form.related_control_id} onChange={e => setForm(f => ({ ...f, related_control_id: e.target.value }))} placeholder="e.g., C007" className="mt-1.5" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add Change</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {detailItem && (
        <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detailItem.title}</DialogTitle>
              <DialogDescription>{detailItem.description ?? 'No description'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-slate-500">Type</p><p className="font-medium mt-0.5">{detailItem.change_type}</p></div>
                <div><p className="text-xs text-slate-500">Environment</p><p className="font-medium mt-0.5">{detailItem.environment ?? '—'}</p></div>
                <div><p className="text-xs text-slate-500">Author</p><p className="font-medium mt-0.5">{detailItem.author_name}</p></div>
                <div><p className="text-xs text-slate-500">Approved By</p><p className="font-medium mt-0.5">{detailItem.approved_by_name ?? '—'}</p></div>
                <div><p className="text-xs text-slate-500">Related Risk</p><p className="font-medium mt-0.5">{detailItem.related_risk_id ?? '—'}</p></div>
                <div><p className="text-xs text-slate-500">Related Control</p><p className="font-medium mt-0.5">{detailItem.related_control_id ?? '—'}</p></div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(detailItem.id, s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        detailItem.status === s
                          ? `${statusColor(s)} border-current scale-105 ring-1 ring-current`
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setDetailItem(null)}>Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </div>
    </div>
  )
}
