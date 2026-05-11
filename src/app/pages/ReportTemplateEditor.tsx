import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ReportTemplate, ReportTemplateSection } from '../../lib/types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Switch } from '../components/ui/switch'
import { ArrowUp, ArrowDown, Eye, EyeOff, Save, Plus, Trash2, RefreshCw, FileText, Layers, ImageIcon, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

const MAX_COVER_IMAGE_BYTES = 1_500_000
const COVER_IMAGE_SECTION_KEY = 'cover_image'
const TEMPLATE_LAYOUT_SECTION_KEY = 'template_layout_settings'

type CoverImageSettings = {
  dataUrl: string | null
  name: string | null
  caption: string | null
  widthMm: number
}

type TemplateLayoutSettings = {
  includeFrontPage: boolean
  pageBreaks: Record<string, boolean>
}

function parseTemplateLayoutSettings(section?: ReportTemplateSection): TemplateLayoutSettings {
  if (!section?.body) return { includeFrontPage: true, pageBreaks: {} }
  try {
    const parsed = JSON.parse(section.body) as Partial<TemplateLayoutSettings>
    return {
      includeFrontPage: parsed.includeFrontPage !== false,
      pageBreaks: parsed.pageBreaks && typeof parsed.pageBreaks === 'object' ? parsed.pageBreaks : {},
    }
  } catch {
    return { includeFrontPage: true, pageBreaks: {} }
  }
}

function parseCoverImageSettings(section?: ReportTemplateSection): CoverImageSettings {
  if (!section?.body) return { dataUrl: null, name: null, caption: '', widthMm: 120 }
  try {
    const parsed = JSON.parse(section.body) as Partial<CoverImageSettings>
    return {
      dataUrl: typeof parsed.dataUrl === 'string' ? parsed.dataUrl : null,
      name: typeof parsed.name === 'string' ? parsed.name : null,
      caption: typeof parsed.caption === 'string' ? parsed.caption : '',
      widthMm: Math.min(170, Math.max(60, Number(parsed.widthMm) || 120)),
    }
  } catch {
    return { dataUrl: null, name: null, caption: '', widthMm: 120 }
  }
}

function stringifyCoverImageSettings(template: ReportTemplate) {
  return JSON.stringify({
    dataUrl: template.cover_image_data_url || null,
    name: template.cover_image_name || null,
    caption: template.cover_image_caption || '',
    widthMm: Math.min(170, Math.max(60, Number(template.cover_image_width_mm) || 120)),
  })
}

function stringifyTemplateLayoutSettings(template: ReportTemplate, sections: ReportTemplateSection[]) {
  return JSON.stringify({
    includeFrontPage: template.include_front_page !== false,
    pageBreaks: Object.fromEntries(
      sections
        .filter(section => section.section_key !== 'cover_subtitle' && section.section_key !== 'footer')
        .map(section => [section.section_key, section.page_break_before !== false])
    ),
  })
}

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
    const templateSections = (secs || []) as ReportTemplateSection[]
    const coverImage = parseCoverImageSettings(templateSections.find(section => section.section_key === COVER_IMAGE_SECTION_KEY))
    const layout = parseTemplateLayoutSettings(templateSections.find(section => section.section_key === TEMPLATE_LAYOUT_SECTION_KEY))
    setTemplate({
      ...tpl,
      include_front_page: layout.includeFrontPage,
      cover_image_data_url: coverImage.dataUrl,
      cover_image_name: coverImage.name,
      cover_image_caption: coverImage.caption,
      cover_image_width_mm: coverImage.widthMm,
    })
    setSections(templateSections
      .filter(section => section.section_key !== COVER_IMAGE_SECTION_KEY && section.section_key !== TEMPLATE_LAYOUT_SECTION_KEY)
      .map(section => ({
        ...section,
        page_break_before: layout.pageBreaks[section.section_key] !== false,
      })))
    setLoading(false)
  }

  const updateSection = (id: string, patch: Partial<ReportTemplateSection>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  const isReportBodySection = (section: ReportTemplateSection) => (
    section.section_key !== 'cover_subtitle' && section.section_key !== 'footer' && section.section_key !== COVER_IMAGE_SECTION_KEY
    && section.section_key !== TEMPLATE_LAYOUT_SECTION_KEY
  )

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
        page_break_before: true,
      },
    ])
  }

  const removeSection = (id: string) => {
    if (!confirm('Remove this section from the template?')) return
    setSections(prev => prev.filter(s => s.id !== id))
  }

  const handleCoverImageChange = (file: File | undefined) => {
    if (!template || !file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      toast.error('Use a PNG or JPEG image for the cover page.')
      return
    }
    if (file.size > MAX_COVER_IMAGE_BYTES) {
      toast.error('Cover images must be 1.5 MB or smaller.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setTemplate({
        ...template,
        cover_image_data_url: String(reader.result || ''),
        cover_image_name: file.name,
      })
    }
    reader.onerror = () => toast.error('Could not read the selected image.')
    reader.readAsDataURL(file)
  }

  const clearCoverImage = () => {
    if (!template) return
    setTemplate({
      ...template,
      cover_image_data_url: null,
      cover_image_name: null,
      cover_image_caption: '',
    })
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
    rows.push({
      template_id: template.id,
      section_key: TEMPLATE_LAYOUT_SECTION_KEY,
      title: 'Template layout settings',
      body: stringifyTemplateLayoutSettings(template, sections),
      position: -20,
      visible: true,
    })
    if (template.cover_image_data_url) {
      rows.push({
        template_id: template.id,
        section_key: COVER_IMAGE_SECTION_KEY,
        title: 'Cover image',
        body: stringifyCoverImageSettings(template),
        position: -10,
        visible: true,
      })
    }
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('report_template_sections').insert(rows)
      if (insErr) { toast.error(insErr.message); setSaving(false); return }
    }

    toast.success('Template saved')
    window.localStorage.setItem('report-template-updated-at', new Date().toISOString())
    window.dispatchEvent(new Event('report-template-updated'))
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

        <Card className="border-slate-200 shadow-none p-5">
          <h2 className="text-sm font-semibold text-slate-700">Report structure</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex items-start justify-between gap-4 rounded border border-slate-200 p-3">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <Label htmlFor="front-page" className="text-sm font-medium text-slate-700">Front page</Label>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Include the generated cover page before the table of contents.
                  </p>
                </div>
              </div>
              <Switch
                id="front-page"
                checked={template.include_front_page !== false}
                onCheckedChange={checked => setTemplate({ ...template, include_front_page: checked })}
                aria-label="Include front page"
              />
            </div>
            <div className="flex gap-3 rounded border border-slate-200 p-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Section pagination</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Set each section to begin on a new page or continue compactly after the previous section.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[220px_1fr] gap-4 rounded border border-slate-200 p-3">
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
              {template.cover_image_data_url ? (
                <img
                  src={template.cover_image_data_url}
                  alt={template.cover_image_name || 'Cover page image'}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <ImageIcon className="h-7 w-7" />
                  <span className="text-xs">No cover image</span>
                </div>
              )}
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Cover image</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    Add a PNG or JPEG to the front page. It is stored with the template and exported to DOCX and PDF.
                  </p>
                </div>
                {template.cover_image_data_url && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearCoverImage} className="h-8 w-8 p-0">
                    <X className="h-4 w-4 text-slate-500" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-[auto_1fr_110px] gap-3">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    onChange={e => handleCoverImageChange(e.target.files?.[0])}
                  />
                </label>
                <Input
                  value={template.cover_image_caption || ''}
                  onChange={e => setTemplate({ ...template, cover_image_caption: e.target.value })}
                  placeholder="Optional caption"
                  className="h-9"
                  aria-label="Cover image caption"
                />
                <div>
                  <Input
                    type="number"
                    min={60}
                    max={170}
                    value={template.cover_image_width_mm ?? 120}
                    onChange={e => setTemplate({ ...template, cover_image_width_mm: Number(e.target.value) })}
                    className="h-9"
                    aria-label="Cover image width in millimeters"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                <span className="truncate">{template.cover_image_name || 'PNG/JPEG, maximum 1.5 MB'}</span>
                <span className="shrink-0">{Math.min(170, Math.max(60, Number(template.cover_image_width_mm) || 120))} mm wide</span>
              </div>
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
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <Input
                      value={s.title}
                      onChange={e => updateSection(s.id, { title: e.target.value })}
                      className="font-medium"
                      placeholder="Section title"
                    />
                    {isReportBodySection(s) ? (
                      <label className="flex h-10 items-center gap-2 rounded border border-slate-200 px-3 text-xs text-slate-500">
                        <Switch
                          checked={s.page_break_before !== false}
                          onCheckedChange={checked => updateSection(s.id, { page_break_before: checked })}
                          aria-label={`Start ${s.title || 'template section'} on a new page`}
                        />
                        <span className="whitespace-nowrap">{s.page_break_before !== false ? 'New page' : 'Compact'}</span>
                      </label>
                    ) : (
                      <div className="flex h-10 items-center rounded border border-slate-200 px-3 text-xs text-slate-400">
                        Template helper
                      </div>
                    )}
                  </div>
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
