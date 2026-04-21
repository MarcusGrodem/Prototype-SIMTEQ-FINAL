import { ChevronUp, ChevronDown, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { ALL_PAGES, PageDef } from './allPages'
import { SidebarItemConfig } from '../hooks/useSidebarConfig'

interface EditorItem extends SidebarItemConfig {
  page: PageDef
}

interface Props {
  config: SidebarItemConfig[]
  view: 'CEO' | 'CTO' | 'QA'
  onToggle: (key: string) => void
  onMoveUp: (key: string) => void
  onMoveDown: (key: string) => void
  onReset: () => void
}

export function SidebarEditor({ config, view, onToggle, onMoveUp, onMoveDown, onReset }: Props) {
  const items: EditorItem[] = config.map(c => ({
    ...c,
    page: ALL_PAGES.find(p => p.key === c.key)!,
  })).filter(i => i.page)

  const allKeys = items.map(i => i.key)
  const visibleItems = items.filter(i => i.visible)
  const hiddenItems = items.filter(i => !i.visible && i.page.view === view)

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pages</p>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          <RotateCcw className="w-2.5 h-2.5" />Reset
        </button>
      </div>

      {/* Visible order */}
      <div className="mb-1">
        <p className="text-[10px] text-slate-400 mb-1.5">Active order</p>
        <div className="space-y-0.5">
          {visibleItems.map((item) => {
            const Icon = item.page.icon
            const globalIdx = allKeys.indexOf(item.key)
            return (
              <div key={item.key} className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-gray-200">
                <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-800 flex-1 truncate">{item.page.name}</span>
                <div className="flex gap-0 shrink-0">
                  <button
                    onClick={() => onMoveUp(item.key)}
                    disabled={globalIdx === 0}
                    className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onMoveDown(item.key)}
                    disabled={globalIdx === allKeys.length - 1}
                    className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onToggle(item.key)}
                    className="p-0.5 text-blue-400 hover:text-slate-400 transition-colors"
                    title="Hide"
                  >
                    <EyeOff className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
          {visibleItems.length === 0 && (
            <p className="text-[10px] text-slate-400 text-center py-2 border border-dashed rounded">Nothing visible</p>
          )}
        </div>
      </div>

      {/* Hidden pages */}
      <div className="border-t border-gray-100 pt-2 space-y-1">
        <p className="text-[10px] text-slate-400 mb-1.5">Hidden pages</p>
        {hiddenItems.map(item => {
          const Icon = item.page.icon
          return (
            <div key={item.key} className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded border border-dashed border-gray-200 opacity-70 hover:opacity-100 transition-opacity">
              <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 flex-1 truncate">{item.page.name}</span>
              <button
                onClick={() => onToggle(item.key)}
                className="p-0.5 text-slate-300 hover:text-blue-500 transition-colors"
                title="Show"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          )
        })}
        {hiddenItems.length === 0 && (
          <p className="text-[10px] text-slate-400 text-center py-1">All pages are visible</p>
        )}
      </div>
    </div>
  )
}
