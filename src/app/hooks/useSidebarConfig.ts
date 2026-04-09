import { useState, useEffect } from 'react'
import { ALL_PAGES, VIEW_DEFAULTS } from '../components/allPages'

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

  const moveUp = (key: string) => {
    const idx = config.findIndex(i => i.key === key)
    if (idx <= 0) return
    const next = [...config]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    save(next)
  }

  const moveDown = (key: string) => {
    const idx = config.findIndex(i => i.key === key)
    if (idx >= config.length - 1) return
    const next = [...config]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    save(next)
  }

  const reset = () =>
    save(ALL_KEYS.map(k => ({ key: k, visible: VIEW_DEFAULTS[view].includes(k) })))

  return { config, toggleVisible, moveUp, moveDown, reset }
}
