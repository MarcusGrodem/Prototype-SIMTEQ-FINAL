import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { RiskCategory } from '../../lib/types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { toast } from 'sonner'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#64748b', '#0f172a',
]

export function RiskCategoriesPage() {
  const [categories, setCategories] = useState<RiskCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [usage, setUsage] = useState<Record<string, { risks: number; controls: number }>>({})
  const [editing, setEditing] = useState<RiskCategory | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[12])
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: cats }, { data: risks }, { data: controls }] = await Promise.all([
      supabase.from('risk_categories').select('*').order('name'),
      supabase.from('risks').select('category'),
      supabase.from('controls').select('category'),
    ])
    setCategories(cats || [])
    const u: Record<string, { risks: number; controls: number }> = {}
    ;(cats || []).forEach(c => { u[c.name] = { risks: 0, controls: 0 } })
    ;(risks || []).forEach((r: { category: string }) => {
      if (!u[r.category]) u[r.category] = { risks: 0, controls: 0 }
      u[r.category].risks += 1
    })
    ;(controls || []).forEach((c: { category: string }) => {
      if (!u[c.category]) u[c.category] = { risks: 0, controls: 0 }
      u[c.category].controls += 1
    })
    setUsage(u)
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null)
    setName('')
    setColor(PRESET_COLORS[12])
    setDescription('')
    setDialogOpen(true)
  }

  const openEdit = (c: RiskCategory) => {
    setEditing(c)
    setName(c.name)
    setColor(c.color || PRESET_COLORS[12])
    setDescription(c.description || '')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return }
    setSaving(true)

    if (editing) {
      const renamed = editing.name !== name.trim()
      const { error } = await supabase
        .from('risk_categories')
        .update({ name: name.trim(), color, description: description || null })
        .eq('id', editing.id)
      if (error) { toast.error(error.message); setSaving(false); return }

      // Cascade rename to risks and controls (text-FK convention)
      if (renamed) {
        await supabase.from('risks').update({ category: name.trim() }).eq('category', editing.name)
        await supabase.from('controls').update({ category: name.trim() }).eq('category', editing.name)
      }
      toast.success('Category updated')
    } else {
      const { error } = await supabase
        .from('risk_categories')
        .insert({ name: name.trim(), color, description: description || null })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Category added')
    }

    setSaving(false)
    setDialogOpen(false)
    loadAll()
  }

  const handleDelete = async (c: RiskCategory) => {
    const u = usage[c.name] || { risks: 0, controls: 0 }
    if (u.risks > 0 || u.controls > 0) {
      toast.error(`Cannot delete: ${u.risks} risk(s) and ${u.controls} control(s) still use this category. Reassign them first.`)
      return
    }
    if (!confirm(`Delete category "${c.name}"?`)) return
    const { error } = await supabase.from('risk_categories').delete().eq('id', c.id)
    if (error) { toast.error(error.message); return }
    toast.success('Category deleted')
    loadAll()
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Risk Categories</h1>
            <p className="text-xs text-slate-400 mt-2">Manage shared categories used by risks and controls</p>
          </div>
          <Button size="sm" onClick={openCreate} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5">
            <Plus className="w-4 h-4" /> New category
          </Button>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Card className="border-slate-200 shadow-none overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">In use</th>
                <th className="px-4 py-3 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="text-center text-sm text-slate-400 py-10">Loading…</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-sm text-slate-400 py-10">No categories yet. Add your first one.</td></tr>
              ) : categories.map(c => {
                const u = usage[c.name] || { risks: 0, controls: 0 }
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border border-slate-200" style={{ background: c.color }} />
                        <span className="text-sm font-medium text-slate-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-md">{c.description || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">{u.risks} risk(s)</Badge>
                        <Badge variant="outline" className="text-xs">{u.controls} control(s)</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="h-8 w-8 p-0"><Pencil className="w-4 h-4 text-slate-500" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} className="h-8 w-8 p-0"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        <p className="text-xs text-slate-400 mt-4">
          Renaming a category cascades to all risks and controls that reference it. A category can only be deleted when nothing uses it.
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Renaming will update every risk and control that uses this category.' : 'Categories are shared between risks and controls.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="cat-name">Name *</Label>
              <Input id="cat-name" value={name} onChange={e => setName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Color</Label>
              <div className="grid grid-cols-7 gap-2 mt-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-md border-2 transition-all ${color === c ? 'border-slate-900 scale-110' : 'border-slate-200'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea id="cat-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1.5" />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              <Tag className="w-4 h-4 mr-1.5" />
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
