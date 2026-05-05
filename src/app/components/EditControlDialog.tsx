import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { toast } from 'sonner'
import { Control } from '../../lib/types'
import { supabase } from '../../lib/supabase'
import { useCategories } from '../hooks/useCategories'
import { Trash2 } from 'lucide-react'
import { showUndoDeleteToast } from '../utils/toastActions'

interface EditControlDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  control: Control | null
  onSuccess?: () => void
}

export function EditControlDialog({ open, onOpenChange, control, onSuccess }: EditControlDialogProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [frequency, setFrequency] = useState<Control['frequency']>('Monthly')
  const [ownerName, setOwnerName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Control['status']>('Pending')
  const [lastExecution, setLastExecution] = useState('')
  const [nextDue, setNextDue] = useState('')
  const [saving, setSaving] = useState(false)
  const { categories } = useCategories()

  useEffect(() => {
    if (control && open) {
      setTitle(control.title)
      setCategory(control.category)
      setFrequency(control.frequency)
      setOwnerName(control.owner_name)
      setDescription(control.description || '')
      setStatus(control.status)
      setLastExecution(control.last_execution || '')
      setNextDue(control.next_due || '')
    }
  }, [control, open])

  if (!control) return null

  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!category.trim()) { toast.error('Category is required'); return }
    if (!ownerName.trim()) { toast.error('Owner is required'); return }

    setSaving(true)
    const { error } = await supabase
      .from('controls')
      .update({
        title: title.trim(),
        category,
        frequency,
        owner_name: ownerName.trim(),
        description: description || null,
        status,
        last_execution: lastExecution || null,
        next_due: nextDue || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', control.id)

    if (error) { toast.error('Failed to update control'); setSaving(false); return }

    toast.success('Control updated', { description: `${title} has been updated.` })
    setSaving(false)
    onOpenChange(false)
    onSuccess?.()
  }

  const handleDelete = async () => {
    if (!confirm(`Delete control "${control.title}"? You can undo for 5 seconds.`)) return

    const [controlRes, riskLinkRes, docLinkRes, reminderRes] = await Promise.all([
      supabase.from('controls').select('*').eq('id', control.id).single(),
      supabase.from('risk_controls').select('*').eq('control_id', control.id),
      supabase.from('document_links').select('*').eq('link_type', 'control').eq('link_id', control.id),
      supabase.from('reminders').select('*').eq('control_id', control.id),
    ])

    if (!controlRes.data) { toast.error('Could not load control before deletion'); return }

    const controlRecord = controlRes.data
    const riskLinkRows = riskLinkRes.data || []
    const docLinkRows = docLinkRes.data || []
    const reminderRows = reminderRes.data || []

    const { error: unlinkError } = await supabase
      .from('document_links')
      .delete()
      .eq('link_type', 'control')
      .eq('link_id', control.id)

    if (unlinkError) { toast.error('Failed to remove control document links'); return }

    const { error } = await supabase.from('controls').delete().eq('id', control.id)
    if (error) {
      if (docLinkRows.length > 0) await supabase.from('document_links').upsert(docLinkRows)
      toast.error('Failed to delete control')
      return
    }

    onOpenChange(false)
    onSuccess?.()

    showUndoDeleteToast('Control deleted', async () => {
      const { error: restoreError } = await supabase.from('controls').upsert(controlRecord)
      if (restoreError) { toast.error('Could not restore control'); return }

      if (riskLinkRows.length > 0) {
        const { error: riskLinkError } = await supabase.from('risk_controls').upsert(riskLinkRows)
        if (riskLinkError) { toast.error('Control restored without linked risks') }
      }

      if (docLinkRows.length > 0) {
        const { error: docLinkError } = await supabase.from('document_links').upsert(docLinkRows)
        if (docLinkError) { toast.error('Control restored without linked documents') }
      }

      if (reminderRows.length > 0) {
        const { error: reminderError } = await supabase.from('reminders').upsert(reminderRows)
        if (reminderError) { toast.error('Control restored without reminders') }
      }

      toast.success('Control restored')
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>Edit control · {control.id}</DialogTitle>
          <DialogDescription>Update fields for this control.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="ec-title" className="text-slate-700">Title *</Label>
            <Input id="ec-title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5 bg-white text-slate-900 border-slate-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ec-cat" className="text-slate-700">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="ec-cat" className="mt-1.5 bg-white text-slate-900 border-slate-300"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  {!categories.find(c => c.name === category) && category && (
                    <SelectItem value={category}>{category}</SelectItem>
                  )}
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ec-freq" className="text-slate-700">Frequency *</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v as Control['frequency'])}>
                <SelectTrigger id="ec-freq" className="mt-1.5 bg-white text-slate-900 border-slate-300"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-slate-900">
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ec-owner" className="text-slate-700">Owner *</Label>
              <Input id="ec-owner" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="mt-1.5 bg-white text-slate-900 border-slate-300" />
            </div>
            <div>
              <Label htmlFor="ec-status" className="text-slate-700">Status</Label>
              <select
                id="ec-status"
                value={status}
                onChange={e => setStatus(e.target.value as Control['status'])}
                className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ec-last" className="text-slate-700">Last execution</Label>
              <Input id="ec-last" type="date" value={lastExecution} onChange={e => setLastExecution(e.target.value)} className="mt-1.5 bg-white text-slate-900 border-slate-300 [color-scheme:light]" />
            </div>
            <div>
              <Label htmlFor="ec-next" className="text-slate-700">Next due</Label>
              <Input id="ec-next" type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} className="mt-1.5 bg-white text-slate-900 border-slate-300 [color-scheme:light]" />
            </div>
          </div>

          <div>
            <Label htmlFor="ec-desc" className="text-slate-700">Description</Label>
            <Textarea
              id="ec-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a short description..."
              className="mt-1.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={handleDelete} className="mr-auto text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
