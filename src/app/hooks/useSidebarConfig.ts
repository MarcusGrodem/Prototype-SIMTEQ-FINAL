import { useState, useEffect } from 'react'
import { ALL_PAGES, PAGE_BY_KEY, VIEW_DEFAULTS } from '../components/allPages'

// Keys that belong to this role — only these may ever be visible
const ownKeys = (view: 'ceo' | 'cto' | 'qa') =>
  new Set(ALL_PAGES.filter(p => p.view === view.toUpperCase()).map(p => p.key))

export interface SidebarItemConfig {
  key: string
  visible: boolean
}

const ALL_KEYS = ALL_PAGES.map(p => p.key)

export function useSidebarConfig(
  view: 'ceo' | 'cto' | 'qa',
  userId: string | undefined
) {
  const storageKey = userId ? `sidebar_v2_${view}_${userId}` : null

  const load = (): SidebarItemConfig[] => {
    const allowed = ownKeys(view)
    if (storageKey) {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as SidebarItemConfig[]
          // Keep saved items that still exist; force non-own-role pages to hidden
          const valid = parsed
            .filter(p => ALL_KEYS.includes(p.key))
            .map(p => ({ ...p, visible: p.visible && allowed.has(p.key) }))
          // Append any brand-new keys not yet in config
          const savedKeys = valid.map(p => p.key)
          const newItems = ALL_KEYS
            .filter(k => !savedKeys.includes(k))
            .map(k => ({ key: k, visible: VIEW_DEFAULTS[view].includes(k) }))
          return [...valid, ...newItems]
        } catch {}
      }
    }
    // Fresh: own view pages visible, others hidden
    return ALL_KEYS.map(k => ({ key: k, visible: VIEW_DEFAULTS[view].includes(k) }))
  }

  const [config, setConfig] = useState<SidebarItemConfig[]>(load)

  useEffect(() => { setConfig(load()) }, [userId])

  const save = (updated: SidebarItemConfig[]) => {
    setConfig(updated)
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const toggleVisible = (key: string) => {
    const allowed = ownKeys(view)
    save(config.map(i => {
      if (i.key !== key) return i
      const next = !i.visible
      return { ...i, visible: next ? allowed.has(key) : false }
    }))
  }

  // Reordering is clamped to within a page's group — items can't be moved
  // out of their assigned group via the sidebar editor.
  const moveUp = (key: string) => {
    const idx = config.findIndex(i => i.key === key)
    if (idx <= 0) return
    const group = PAGE_BY_KEY[key]?.group
    if (!group) return
    for (let j = idx - 1; j >= 0; j--) {
      if (PAGE_BY_KEY[config[j].key]?.group === group) {
        const next = [...config]
        ;[next[j], next[idx]] = [next[idx], next[j]]
        save(next)
        return
      }
    }
  }

  const moveDown = (key: string) => {
    const idx = config.findIndex(i => i.key === key)
    if (idx === -1 || idx >= config.length - 1) return
    const group = PAGE_BY_KEY[key]?.group
    if (!group) return
    for (let j = idx + 1; j < config.length; j++) {
      if (PAGE_BY_KEY[config[j].key]?.group === group) {
        const next = [...config]
        ;[next[idx], next[j]] = [next[j], next[idx]]
        save(next)
        return
      }
    }
  }

  const reset = () =>
    save(ALL_KEYS.map(k => ({ key: k, visible: VIEW_DEFAULTS[view].includes(k) })))

  return { config, toggleVisible, moveUp, moveDown, reset }
}
