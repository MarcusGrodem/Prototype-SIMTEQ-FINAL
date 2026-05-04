import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ReportTemplate, ReportTemplateSection } from '../../lib/types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { ArrowUp, ArrowDown, Eye, EyeOff, Save, Plus, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export function ReportTemplateEditor() {
  const [template, setTemplate] = useState<ReportTemplate | null>(null)
  const [sections, setSections] = useState<ReportTemplateSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data: tpls } = await supabase
      .from('report_templates')
      .select('*')
      .order('is_default', { ascending: false })
      .limit(1)
    const tpl = (tpls || [])[0] as ReportTemplate | undefined
    if (!tpl) { setLoading(false); toast.error('No template found. Run the migration.'); return }
    setTemplate(tpl)
    const { data: secs } = await supabase
      .from('report_template_sections')
      .select('*')
      .eq('template_id', tpl.id)
      .order('position')
    setSections(secs || [])
    setLoading(false)
  }

  const updateSection = (id: string, patch: Partial<ReportTemplateSection>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...sections]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    next.forEach((s, i) => s.position = i * 10)
    setSections(next)
  }

  const addSection = () => {
    const id = `tmp_${Date.now()}`
    setSections(prev => [
      ...prev,
      {
        id,
        template_id: template?.id ?? '',
        section_key: `sec_${Date.now()}`,
        title: 'New section',
        body: '',
        position: prev.length * 10,
        visible: true,
      },
    ])
  }

  const removeSection = (id: string) => {
    if (!confirm('Remove this section from the template?')) return
    setSections(prev => prev.filter(s => s.id !== id))
  }

  const handleSave = async () => {
    if (!template) return
    setSaving(true)

    const { error: tplErr } = await supabase
      .from('report_templates')
      .update({
        name: template.name,
        company_name: template.company_name,
        period_start: template.period_start,
        period_end: template.period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', template.id)
    if (tplErr) { toast.error(tplErr.message); setSaving(false); return }

    // Delete existing sections then re-insert (simple, lets us reorder freely)
    const { error: delErr } = await supabase
      .from('report_template_sections')
      .delete()
      .eq('template_id', template.id)
    if (delErr) { toast.error(delErr.message); setSaving(false); return }

    const rows = sections.map((s, i) => ({
      template_id: template.id,
      section_key: s.section_key,
      title: s.title,
      body: s.body,
      position: i * 10,
      visible: s.visible,
    }))
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('report_template_sections').insert(rows)
      if (insErr) { toast.error(insErr.message); setSaving(false); return }
    }

    toast.success('Template saved')
    setSaving(false)
    load()
  }

  if (loading) return <div className="p-8 text-sm text-slate-400">Loading…</div>
  if (!template) return <div className="p-8 text-sm text-slate-400">No template available.</div>

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Report Template</h1>
            <p className="text-xs text-slate-400 mt-2">Edit the boilerplate text used by the audit report generator. Use <code className="bg-slate-100 px-1 rounded">{'{{company}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{periodStart}}'}</code>, <code className="bg-slate-100 px-1 rounded">{'{{periodEnd}}'}</code> as placeholders.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="w-4 h-4" /> Reload</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5">
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save template'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Template metadata */}
        <Card className="border-slate-200 shadow-none p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Template details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="t-name">Name</Label>
              <Input id="t-name" value={template.name} onChange={e => setTemplate({ ...template, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="t-company">Company name</Label>
              <Input id="t-company" value={template.company_name} onChange={e => setTemplate({ ...template, company_name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="t-start">Period start</Label>
              <Input id="t-start" value={template.period_start} onChange={e => setTemplate({ ...template, period_start: e.target.value })} className="mt-1.5" />
              <p className="text-[11px] text-slate-400 mt-1">Free text, e.g. <code>January 1, 2026</code>.</p>
            </div>
            <div>
              <Label htmlFor="t-end">Period end</Label>
              <Input id="t-end" value={template.period_end} onChange={e => setTemplate({ ...template, period_end: e.target.value })} className="mt-1.5" />
            </div>
          </div>
        </Card>

        {/* Sections */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Sections ({sections.filter(s => s.visible).length} visible / {sections.length} total)</h2>
          <Button variant="outline" size="sm" onClick={addSection} className="gap-1.5"><Plus className="w-4 h-4" /> Add section</Button>
        </div>

        <div className="space-y-3">
          {sections.map((s, i) => (
            <Card key={s.id} className={`border-slate-200 shadow-none p-4 ${!s.visible ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <Badge variant="outline" className="text-[10px] font-mono">{s.section_key}</Badge>
                  <div className="flex flex-col">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={i === sections.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    value={s.title}
                    onChange={e => updateSection(s.id, { title: e.target.value })}
                    className="font-medium"
                    placeholder="Section title"
                  />
                  <Textarea
                    value={s.body}
                    onChange={e => updateSection(s.id, { body: e.target.value })}
                    rows={6}
                    aria-label={`Body for ${s.title || 'template section'}`}
                    className="font-mono text-xs"
                    placeholder="Section body. Separate paragraphs with a blank line. Lines starting with • become bullet points."
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => updateSection(s.id, { visible: !s.visible })}>
                    {s.visible ? <Eye className="w-4 h-4 text-slate-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeSection(s.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {sections.length === 0 && (
            <Card className="border-slate-200 shadow-none p-8 text-center text-sm text-slate-400">
              No sections — add one to get started.
            </Card>
          )}
        </div>

        <p className="text-xs text-slate-400 pt-2">
          Auto-generated content (control tables, risk register, summary statistics) is not editable here — those sections are computed at generation time so they stay in sync with live data.
        </p>
      </div>
    </div>
  )
}
