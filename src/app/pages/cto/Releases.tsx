import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../../components/ui/dialog'
import {
  Search, Download, Plus, Package, CheckCircle2, Clock,
  ChevronRight, X, FileText, AlertTriangle, Zap, ShieldCheck,
  TrendingUp, Check, FileDown, User, ArrowLeft, Tag, ExternalLink
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Release, ReleaseChange, Product } from '../../../lib/types'
import { downloadCSV } from '../../utils/exportUtils'
import { toast } from 'sonner'
import { useAuth } from '../../../contexts/AuthContext'
import jsPDF from 'jspdf'

const STATUS_OPTIONS = ['Planned', 'In Progress', 'Released', 'Rolled Back'] as const
const ENV_OPTIONS = ['Production', 'Staging', 'Development'] as const
const CHANGE_TYPES = ['Feature', 'Bug Fix', 'Security', 'Breaking Change', 'Performance', 'Other'] as const
const SAMPLE_DATA_URL = 'https://github.com/MarcusGrodem/Prototype-SIMTEQ-FINAL/blob/main/supabase/seed.sql'

const statusColor = (s: string) => {
  switch (s) {
    case 'Planned': return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Released': return 'bg-green-100 text-green-700 border-green-200'
    case 'Rolled Back': return 'bg-red-100 text-red-700 border-red-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

const envColor = (e: string) => {
  switch (e) {
    case 'Production': return 'bg-red-50 text-red-700 border-red-200'
    case 'Staging': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    case 'Development': return 'bg-green-50 text-green-700 border-green-200'
    default: return 'bg-slate-50 text-slate-700 border-slate-200'
  }
}

const changeTypeColor = (t: string) => {
  switch (t) {
    case 'Feature': return 'bg-blue-100 text-blue-700'
    case 'Bug Fix': return 'bg-orange-100 text-orange-700'
    case 'Security': return 'bg-red-100 text-red-700'
    case 'Breaking Change': return 'bg-amber-100 text-amber-700'
    case 'Performance': return 'bg-teal-100 text-teal-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

const changeTypeIcon = (t: string) => {
  switch (t) {
    case 'Feature': return <Zap className="w-3 h-3" />
    case 'Bug Fix': return <AlertTriangle className="w-3 h-3" />
    case 'Security': return <ShieldCheck className="w-3 h-3" />
    case 'Breaking Change': return <X className="w-3 h-3" />
    case 'Performance': return <TrendingUp className="w-3 h-3" />
    default: return <FileText className="w-3 h-3" />
  }
}

function downloadReleasePDF(release: Release) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2
  let y = 0

  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pageW, 45, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('Release Documentation', margin, 20)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${release.product_name ?? 'Product'} – ${release.version}: ${release.title}`, margin, 33)

  y = 58
  const metaRows = [
    ['Product', release.product_name ?? '–'],
    ['Version', release.version],
    ['Environment', release.environment],
    ['Status', release.status],
    ['Release Date', release.release_date ? new Date(release.release_date).toLocaleDateString('en-GB') : '–'],
    ['Released by', release.released_by_name ?? '–'],
    ['Approved by', release.approved_by_name ?? 'Pending approval'],
    ['Approval date', release.approved_at ? new Date(release.approved_at).toLocaleDateString('en-GB') : '–'],
    ['Generated', new Date().toLocaleDateString('en-GB')],
  ]

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(31, 41, 55)
  doc.text('Release Metadata', margin, y); y += 6

  metaRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(107, 114, 128)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(31, 41, 55)
    doc.text(value, margin + 40, y); y += 6
  })

  y += 4
  if (release.description) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(31, 41, 55)
    doc.text('Description', margin, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(55, 65, 81)
    const lines = doc.splitTextToSize(release.description, contentW)
    doc.text(lines, margin, y); y += lines.length * 4.5 + 6
  }

  if (release.changes && release.changes.length > 0) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(31, 41, 55)
    doc.text('Changelog', margin, y); y += 6
    const grouped: Record<string, ReleaseChange[]> = {}
    release.changes.forEach(c => { if (!grouped[c.change_type]) grouped[c.change_type] = []; grouped[c.change_type].push(c) })
    Object.entries(grouped).forEach(([type, changes]) => {
      if (y > 260) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 64, 175)
      doc.text(type.toUpperCase(), margin, y); y += 5
      changes.forEach(c => {
        if (y > 265) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(55, 65, 81)
        const lines = doc.splitTextToSize(`• ${c.description}`, contentW - 4)
        doc.text(lines, margin + 2, y); y += lines.length * 4.5 + 1
      }); y += 3
    })
  }

  y += 4
  if (y > 240) { doc.addPage(); y = 20 }
  doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.5)
  doc.rect(margin, y, contentW, 28)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(31, 41, 55)
  doc.text('Approval Record', margin + 4, y + 6)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(75, 85, 99)
  doc.text(`Released by: ${release.released_by_name ?? '–'}`, margin + 4, y + 13)
  doc.text(`Approved by: ${release.approved_by_name ?? 'Pending'}`, margin + 4, y + 19)
  doc.text(`Approved at: ${release.approved_at ? new Date(release.approved_at).toLocaleString('en-GB') : 'Not yet approved'}`, margin + 4, y + 25)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(156, 163, 175)
  doc.text(`SIMTEQ AS – Release Log – ${release.product_name ?? ''} ${release.version} – CONFIDENTIAL`, pageW / 2, 290, { align: 'center' })
  doc.save(`Release_${(release.product_name ?? 'product').replace(/\s+/g, '_')}_${release.version}_${new Date().toISOString().split('T')[0]}.pdf`)
}

type View = 'products' | 'releases' | 'detail'

export function Releases() {
  const [products, setProducts] = useState<Product[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('products')
  const [activeProduct, setActiveProduct] = useState<string | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null)
  const [search, setSearch] = useState('')
  const [addReleaseOpen, setAddReleaseOpen] = useState(false)
  const [addChangeOpen, setAddChangeOpen] = useState(false)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const { profile } = useAuth()

  const [releaseForm, setReleaseForm] = useState({
    version: '', title: '', description: '',
    environment: 'Production' as typeof ENV_OPTIONS[number],
    status: 'Planned' as typeof STATUS_OPTIONS[number],
    release_date: '', product_name: '',
  })
  const [changeForm, setChangeForm] = useState({ change_type: 'Feature' as typeof CHANGE_TYPES[number], description: '' })
  const [productForm, setProductForm] = useState({ name: '', description: '', owner_name: '' })

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: prods }, { data: rels }, { data: changes }] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('releases').select('*').order('release_date', { ascending: false }),
      supabase.from('release_changes').select('*').order('created_at'),
    ])
    const changeMap: Record<string, ReleaseChange[]> = {}
    ;(changes || []).forEach(c => { if (!changeMap[c.release_id]) changeMap[c.release_id] = []; changeMap[c.release_id].push(c) })
    const withChanges = (rels || []).map(r => ({ ...r, changes: changeMap[r.id] || [] }))
    setProducts(prods || [])
    setReleases(withChanges)
    setLoading(false)
  }

  // All unique product names (from releases + products table)
  const allProductNames = Array.from(new Set([
    ...(products.map(p => p.name)),
    ...(releases.map(r => r.product_name).filter(Boolean) as string[]),
  ])).sort()

  const productReleases = (name: string) => releases.filter(r => r.product_name === name)

  const filteredReleases = releases.filter(r => {
    const inProduct = r.product_name === activeProduct
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.version.toLowerCase().includes(search.toLowerCase())
    return inProduct && matchSearch
  })

  const handleSelectProduct = (name: string) => {
    setActiveProduct(name)
    setSelectedRelease(null)
    setSearch('')
    setView('releases')
  }

  const handleSelectRelease = (rel: Release) => {
    setSelectedRelease(rel)
    setView('detail')
  }

  const handleBack = () => {
    if (view === 'detail') { setView('releases'); setSelectedRelease(null) }
    else if (view === 'releases') { setView('products'); setActiveProduct(null) }
  }

  const handleAddRelease = async () => {
    if (!releaseForm.version || !releaseForm.title || !releaseForm.product_name) {
      toast.error('Version, title and product are required'); return
    }
    const { error } = await supabase.from('releases').insert({
      version: releaseForm.version, title: releaseForm.title,
      description: releaseForm.description || null,
      environment: releaseForm.environment, status: releaseForm.status,
      released_by_name: profile?.full_name ?? 'Unknown',
      product_name: releaseForm.product_name,
      release_date: releaseForm.release_date || null,
    })
    if (error) { toast.error('Failed to create release'); return }
    toast.success('Release created')
    setAddReleaseOpen(false)
    setReleaseForm({ version: '', title: '', description: '', environment: 'Production', status: 'Planned', release_date: '', product_name: '' })
    loadAll()
  }

  const handleAddChange = async () => {
    if (!selectedRelease || !changeForm.description) return
    const { error } = await supabase.from('release_changes').insert({ release_id: selectedRelease.id, change_type: changeForm.change_type, description: changeForm.description })
    if (error) { toast.error('Failed to add change'); return }
    toast.success('Changelog entry added')
    setAddChangeOpen(false)
    setChangeForm({ change_type: 'Feature', description: '' })
    const { data } = await supabase.from('release_changes').select('*').eq('release_id', selectedRelease.id).order('created_at')
    const updated = { ...selectedRelease, changes: data || [] }
    setSelectedRelease(updated)
    setReleases(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  const handleApprove = async (rel: Release) => {
    const { error } = await supabase.from('releases').update({
      approved_by_name: profile?.full_name ?? 'Unknown',
      approved_at: new Date().toISOString(),
      status: 'Released',
    }).eq('id', rel.id)
    if (error) { toast.error('Failed to approve release'); return }
    toast.success(`${rel.version} approved and marked as Released`)
    const updated = { ...rel, approved_by_name: profile?.full_name ?? 'Unknown', approved_at: new Date().toISOString(), status: 'Released' as const }
    setSelectedRelease(updated)
    setReleases(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.owner_name) { toast.error('Name and owner are required'); return }
    const { error } = await supabase.from('products').insert(productForm)
    if (error) { toast.error('Failed to create product'); return }
    toast.success('Product created')
    setAddProductOpen(false)
    setProductForm({ name: '', description: '', owner_name: '' })
    loadAll()
  }

  const handleExportCSV = () => {
    const rows = filteredReleases.flatMap(r =>
      (r.changes && r.changes.length > 0)
        ? r.changes.map(c => ({ product: r.product_name ?? '', version: r.version, release_title: r.title, status: r.status, environment: r.environment, release_date: r.release_date ?? '', released_by: r.released_by_name ?? '', approved_by: r.approved_by_name ?? '', change_type: c.change_type, change_description: c.description }))
        : [{ product: r.product_name ?? '', version: r.version, release_title: r.title, status: r.status, environment: r.environment, release_date: r.release_date ?? '', released_by: r.released_by_name ?? '', approved_by: r.approved_by_name ?? '', change_type: '', change_description: '' }]
    )
    downloadCSV(rows, `ReleaseLog_${activeProduct ?? 'all'}_${new Date().toISOString().split('T')[0]}.csv`)
  }

  // ── PRODUCT OVERVIEW ─────────────────────────────────────────────
  if (view === 'products') {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
            <p className="text-sm text-slate-500 mt-1">Select a product to view its release history</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddProductOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />New Product
            </Button>
            <Button size="sm" onClick={() => setAddReleaseOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />New Release
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-xs text-slate-500 font-medium">Total Products</p>
            <p className="text-2xl font-semibold text-slate-900 mt-1">{allProductNames.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500 font-medium">Total Releases</p>
            <p className="text-2xl font-semibold text-blue-600 mt-1">{releases.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500 font-medium">Released</p>
            <p className="text-2xl font-semibold text-green-600 mt-1">{releases.filter(r => r.status === 'Released').length}</p>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {allProductNames.map(name => {
              const rels = productReleases(name)
              const released = rels.filter(r => r.status === 'Released').length
              const inProgress = rels.filter(r => r.status === 'In Progress').length
              const latest = rels.find(r => r.status === 'Released') ?? rels[0]
              const product = products.find(p => p.name === name)
              return (
                <Card
                  key={name}
                  className="p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                  onClick={() => handleSelectProduct(name)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{name}</h3>
                        {product?.owner_name && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3" />{product.owner_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mt-1 transition-colors" />
                  </div>

                  {product?.description && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{product.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-lg font-semibold text-slate-900">{rels.length}</p>
                      <p className="text-[10px] text-slate-500">Versions</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-lg font-semibold text-green-700">{released}</p>
                      <p className="text-[10px] text-green-600">Released</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-lg font-semibold text-blue-700">{inProgress}</p>
                      <p className="text-[10px] text-blue-600">In Progress</p>
                    </div>
                  </div>

                  {latest && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-500">Latest:</span>
                        <span className="text-xs font-mono font-semibold tabular-nums text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{latest.version}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(latest.status)}`}>{latest.status}</Badge>
                      </div>
                      {latest.release_date && (
                        <span className="text-[10px] text-slate-400">{new Date(latest.release_date).toLocaleDateString('en-GB')}</span>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}

            {allProductNames.length === 0 && (
              <div className="col-span-2 text-center py-16 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p className="font-medium text-slate-500">No products yet</p>
                <p className="text-sm mt-1">Create your first product to start tracking releases</p>
                <Button className="mt-4" onClick={() => setAddProductOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />Add Product
                </Button>
                <a
                  href={SAMPLE_DATA_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors"
                >
                  Load sample data <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Dialogs shared */}
        <AddProductDialog open={addProductOpen} onClose={() => setAddProductOpen(false)} form={productForm} setForm={setProductForm} onSave={handleAddProduct} />
        <AddReleaseDialog open={addReleaseOpen} onClose={() => setAddReleaseOpen(false)} form={releaseForm} setForm={setReleaseForm} productNames={allProductNames} onSave={handleAddRelease} />
      </div>
    )
  }

  // ── RELEASE TIMELINE ─────────────────────────────────────────────
  if (view === 'releases') {
    return (
      <div className="flex h-full">
        <div className="flex-1 p-8 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Products
            </button>
            <span className="text-slate-300">/</span>
            <h1 className="text-xl font-semibold text-slate-900">{activeProduct}</h1>
          </div>

          <div className="flex items-center justify-between">
            {/* Stats */}
            <div className="flex gap-3">
              {STATUS_OPTIONS.map(s => (
                <div key={s} className="text-center">
                  <p className={`text-lg font-semibold ${s === 'Released' ? 'text-green-600' : s === 'In Progress' ? 'text-blue-600' : s === 'Rolled Back' ? 'text-red-600' : 'text-slate-700'}`}>
                    {filteredReleases.filter(r => r.status === s).length}
                  </p>
                  <p className="text-[10px] text-slate-500">{s}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
              <Button size="sm" onClick={() => { setReleaseForm(f => ({ ...f, product_name: activeProduct ?? '' })); setAddReleaseOpen(true) }}>
                <Plus className="w-4 h-4 mr-2" />New Release
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search versions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="text-center py-16 text-slate-400">Loading...</div>
          ) : filteredReleases.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-3 text-slate-200" />
              <p>No releases yet for this product</p>
              <Button className="mt-4" size="sm" onClick={() => setAddReleaseOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />Add first release
              </Button>
              <a
                href={SAMPLE_DATA_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 transition-colors"
              >
                Load sample data <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="relative ml-4">
              <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
              <div className="space-y-3">
                {filteredReleases.map(rel => (
                  <div
                    key={rel.id}
                    className="relative ml-6 cursor-pointer group"
                    onClick={() => handleSelectRelease(rel)}
                  >
                    <div className={`absolute -left-[25px] top-5 w-3 h-3 rounded-full border-2 border-white ${
                      rel.status === 'Released' ? 'bg-green-500' :
                      rel.status === 'In Progress' ? 'bg-blue-500' :
                      rel.status === 'Rolled Back' ? 'bg-red-500' : 'bg-slate-300'
                    }`} />
                    <Card className="p-4 hover:shadow-md transition-all hover:border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-mono font-bold tabular-nums bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{rel.version}</span>
                            <Badge variant="outline" className={`text-xs ${envColor(rel.environment)}`}>{rel.environment}</Badge>
                            <Badge variant="outline" className={`text-xs ${statusColor(rel.status)}`}>{rel.status}</Badge>
                            {rel.approved_by_name && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />Approved
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900 mt-1.5">{rel.title}</h3>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                            {rel.release_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(rel.release_date).toLocaleDateString('en-GB')}</span>}
                            {rel.released_by_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{rel.released_by_name}</span>}
                            {rel.changes && rel.changes.length > 0 && (
                              <span className="text-blue-600 flex items-center gap-1"><FileText className="w-3 h-3" />{rel.changes.length} change{rel.changes.length !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                          {rel.changes && rel.changes.length > 0 && (
                            <div className="flex gap-1.5 mt-2.5 flex-wrap">
                              {Array.from(new Set(rel.changes.map(c => c.change_type))).map(type => (
                                <span key={type} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${changeTypeColor(type)}`}>
                                  {changeTypeIcon(type)}{type}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mt-1 shrink-0 ml-2" />
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <AddReleaseDialog open={addReleaseOpen} onClose={() => setAddReleaseOpen(false)} form={releaseForm} setForm={setReleaseForm} productNames={allProductNames} onSave={handleAddRelease} />
      </div>
    )
  }

  // ── RELEASE DETAIL ───────────────────────────────────────────────
  if (view === 'detail' && selectedRelease) {
    return (
      <div className="p-8 space-y-6 max-w-3xl overflow-auto h-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => { setView('products'); setActiveProduct(null); setSelectedRelease(null) }} className="hover:text-slate-900 transition-colors">Products</button>
          <ChevronRight className="w-3.5 h-3.5" />
          <button onClick={handleBack} className="hover:text-slate-900 transition-colors">{activeProduct}</button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-medium tabular-nums">{selectedRelease.version}</span>
        </div>

        {/* Title */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-lg font-mono font-bold tabular-nums bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{selectedRelease.version}</span>
              <Badge variant="outline" className={`${envColor(selectedRelease.environment)}`}>{selectedRelease.environment}</Badge>
              <Badge variant="outline" className={`${statusColor(selectedRelease.status)}`}>{selectedRelease.status}</Badge>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">{selectedRelease.title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{selectedRelease.product_name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-1.5" />CSV
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => downloadReleasePDF(selectedRelease)}>
              <FileDown className="w-4 h-4 mr-1.5" />Download PDF
            </Button>
          </div>
        </div>

        {/* Metadata card */}
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Release Details</h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">Release Date</p>
              <p className="text-slate-900">{selectedRelease.release_date ? new Date(selectedRelease.release_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '–'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">Environment</p>
              <Badge variant="outline" className={`text-xs ${envColor(selectedRelease.environment)}`}>{selectedRelease.environment}</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">Released by</p>
              <p className="text-slate-900 flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-400" />{selectedRelease.released_by_name ?? '–'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">Approved by</p>
              {selectedRelease.approved_by_name ? (
                <p className="text-green-700 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />{selectedRelease.approved_by_name}
                  {selectedRelease.approved_at && <span className="text-xs text-slate-400 font-normal ml-1">({new Date(selectedRelease.approved_at).toLocaleDateString('en-GB')})</span>}
                </p>
              ) : (
                <p className="text-orange-600">Pending approval</p>
              )}
            </div>
          </div>

          {selectedRelease.description && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium mb-1.5">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed">{selectedRelease.description}</p>
            </div>
          )}
        </Card>

        {/* Approval CTA */}
        {!selectedRelease.approved_by_name && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-800">Awaiting approval</p>
              <p className="text-xs text-orange-700 mt-0.5">Approve this release to mark it as Released and create an audit trail.</p>
            </div>
            <Button className="bg-green-600 hover:bg-green-700 shrink-0" onClick={() => handleApprove(selectedRelease)}>
              <Check className="w-4 h-4 mr-2" />Approve & Release
            </Button>
          </div>
        )}

        {/* Changelog */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Changelog ({selectedRelease.changes?.length ?? 0} entries)</h2>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAddChangeOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add entry
            </Button>
          </div>

          {(!selectedRelease.changes || selectedRelease.changes.length === 0) ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
              <FileText className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              <p className="text-sm text-slate-400">No changelog entries yet</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => setAddChangeOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Add first entry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {CHANGE_TYPES.map(type => {
                const items = selectedRelease.changes?.filter(c => c.change_type === type) ?? []
                if (items.length === 0) return null
                return (
                  <div key={type}>
                    <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium mb-2 ${changeTypeColor(type)}`}>
                      {changeTypeIcon(type)}{type}
                    </div>
                    <ul className="space-y-1.5 pl-1">
                      {items.map(c => (
                        <li key={c.id} className="flex gap-2 text-sm text-slate-700">
                          <span className="text-slate-300 shrink-0 mt-0.5">•</span>
                          <span>{c.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Dialogs */}
        <Dialog open={addChangeOpen} onOpenChange={setAddChangeOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Changelog Entry</DialogTitle>
              <DialogDescription><span className="tabular-nums">{selectedRelease.product_name} {selectedRelease.version}</span></DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Change Type</Label>
                <select value={changeForm.change_type} onChange={e => setChangeForm(f => ({ ...f, change_type: e.target.value as typeof CHANGE_TYPES[number] }))} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {CHANGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="release-change-description">Description *</Label>
                <Textarea
                  id="release-change-description"
                  value={changeForm.description}
                  onChange={e => setChangeForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what changed..."
                  className="mt-1.5"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setAddChangeOpen(false)}>Cancel</Button>
                <Button onClick={handleAddChange} disabled={!changeForm.description}>Add Entry</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return null
}

// ── SHARED DIALOGS ──────────────────────────────────────────────────

function AddProductDialog({ open, onClose, form, setForm, onSave }: {
  open: boolean; onClose: () => void
  form: { name: string; description: string; owner_name: string }
  setForm: (f: any) => void; onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Product</DialogTitle>
          <DialogDescription>Register a new product to track releases for.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Product Name *</Label>
            <Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g., SIMTEQ Core" className="mt-1.5" />
          </div>
          <div>
            <Label>Owner *</Label>
            <Input value={form.owner_name} onChange={e => setForm((f: any) => ({ ...f, owner_name: e.target.value }))} placeholder="Responsible person or team" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={form.description}
              onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
              placeholder="What does this product do?"
              className="mt-1.5"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onSave}>Create Product</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AddReleaseDialog({ open, onClose, form, setForm, productNames, onSave }: {
  open: boolean; onClose: () => void
  form: { version: string; title: string; description: string; environment: string; status: string; release_date: string; product_name: string }
  setForm: (f: any) => void; productNames: string[]; onSave: () => void
}) {
  const STATUS_OPTIONS = ['Planned', 'In Progress', 'Released', 'Rolled Back']
  const ENV_OPTIONS = ['Production', 'Staging', 'Development']
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Release</DialogTitle>
          <DialogDescription>Create a new versioned release entry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Product *</Label>
            <select value={form.product_name} onChange={e => setForm((f: any) => ({ ...f, product_name: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select product…</option>
              {productNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Version *</Label>
              <Input value={form.version} onChange={e => setForm((f: any) => ({ ...f, version: e.target.value }))} placeholder="e.g., v2.1.0" className="mt-1.5" />
            </div>
            <div>
              <Label>Environment</Label>
              <select value={form.environment} onChange={e => setForm((f: any) => ({ ...f, environment: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ENV_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="Release title" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="release-description">Description</Label>
            <Textarea
              id="release-description"
              value={form.description}
              onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
              placeholder="What's in this release?"
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>Release Date</Label>
              <Input type="date" value={form.release_date} onChange={e => setForm((f: any) => ({ ...f, release_date: e.target.value }))} className="mt-1.5" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onSave}>Create Release</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
