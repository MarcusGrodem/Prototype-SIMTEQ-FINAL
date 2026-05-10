import { ChevronUp, ChevronDown, RotateCcw, Eye, EyeOff } from 'lucide-react'
import { ALL_PAGES, GROUPS, PageDef, ViewKey } from './allPages'
import { SidebarItemConfig } from '../hooks/useSidebarConfig'

interface EditorItem extends SidebarItemConfig {
  page: PageDef
}

interface Props {
  config: SidebarItemConfig[]
  view: ViewKey
  onToggle: (key: string) => void
  onMoveUp: (key: string) => void
  onMoveDown: (key: string) => void
  onReset: () => void
}

export function SidebarEditor({ config, view, onToggle, onMoveUp, onMoveDown, onReset }: Props) {
  const items: EditorItem[] = config
    .map(c => ({ ...c, page: ALL_PAGES.find(p => p.key === c.key)! }))
    .filter(i => i.page && i.page.view === view)

  const groups = GROUPS.filter(g => g.view === view)

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customize</p>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          <RotateCcw className="w-2.5 h-2.5" />Reset
        </button>
      </div>

      {groups.map(group => {
        const groupItems = items.filter(i => i.page.group === group.key)
        if (groupItems.length === 0) return null

        const visibleInGroup = groupItems.filter(i => i.visible)
        const firstVisibleKey = visibleInGroup[0]?.key
        const lastVisibleKey  = visibleInGroup[visibleInGroup.length - 1]?.key

        return (
          <div key={group.key} className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider px-1">{group.label}</p>
            <div className="space-y-0.5">
              {groupItems.map(item => {
                const Icon = item.page.icon
                if (!item.visible) {
                  return (
                    <div
                      key={item.key}
                      className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded border border-dashed border-gray-200 opacity-70 hover:opacity-100 transition-opacity"
                    >
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
                }
                const isFirst = item.key === firstVisibleKey
                const isLast  = item.key === lastVisibleKey
                return (
                  <div key={item.key} className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-gray-200">
                    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-800 flex-1 truncate">{item.page.name}</span>
                    <div className="flex gap-0 shrink-0">
                      <button
                        onClick={() => onMoveUp(item.key)}
                        disabled={isFirst}
                        className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
                        title="Move up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onMoveDown(item.key)}
                        disabled={isLast}
                        className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
                        title="Move down"
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
            </div>
          </div>
        )
      })}
    </div>
  )
}
