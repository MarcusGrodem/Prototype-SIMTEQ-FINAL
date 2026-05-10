import { useCallback, useEffect, useState } from 'react'

// Per-user, per-role expanded state for sidebar groups.
// Entries are written lazily — only groups the user has manually toggled appear.
// Anything not in the map is considered "expanded by default".

const storageKeyFor = (view: 'ceo' | 'cto' | 'qa', userId: string | undefined) =>
  userId ? `sidebar_groups_v1_${view}_${userId}` : null

export function useSidebarGroups(
  view: 'ceo' | 'cto' | 'qa',
  userId: string | undefined,
) {
  const storageKey = storageKeyFor(view, userId)

  const load = (): Record<string, boolean> => {
    if (!storageKey) return {}
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    try { return JSON.parse(raw) as Record<string, boolean> } catch { return {} }
  }

  const [state, setState] = useState<Record<string, boolean>>(load)

  useEffect(() => { setState(load()) }, [userId, view])

  const isExpanded = useCallback(
    (groupKey: string, fallback = true) =>
      state[groupKey] ?? fallback,
    [state],
  )

  const toggle = useCallback((groupKey: string) => {
    setState(prev => {
      const next = { ...prev, [groupKey]: !(prev[groupKey] ?? true) }
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  return { isExpanded, toggle }
}
