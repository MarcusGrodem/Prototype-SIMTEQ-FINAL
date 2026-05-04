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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit control · {control.id}</DialogTitle>
          <DialogDescription>Update fields for this control.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="ec-title">Title *</Label>
            <Input id="ec-title" value={title} onChange={e => setTitle(e.target.value)} className="mt-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ec-cat">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="ec-cat" className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
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
              <Label htmlFor="ec-freq">Frequency *</Label>
              <Select value={frequency} onValueChange={v => setFrequency(v as Control['frequency'])}>
                <SelectTrigger id="ec-freq" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ec-owner">Owner *</Label>
              <Input id="ec-owner" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ec-status">Status</Label>
              <select
                id="ec-status"
                value={status}
                onChange={e => setStatus(e.target.value as Control['status'])}
                className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ec-last">Last execution</Label>
              <Input id="ec-last" type="date" value={lastExecution} onChange={e => setLastExecution(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="ec-next">Next due</Label>
              <Input id="ec-next" type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label htmlFor="ec-desc">Description</Label>
            <Textarea id="ec-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1.5" />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
