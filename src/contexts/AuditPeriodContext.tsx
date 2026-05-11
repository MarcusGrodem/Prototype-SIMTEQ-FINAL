import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { AuditPeriod } from '../lib/types'
import { demoAuditPeriods } from '../app/data/demoFallbacks'

interface AuditPeriodContextType {
  activePeriod: AuditPeriod | null
  allPeriods: AuditPeriod[]
  loading: boolean
  refresh: () => Promise<void>
}

const AuditPeriodContext = createContext<AuditPeriodContextType | null>(null)

export function AuditPeriodProvider({ children }: { children: React.ReactNode }) {
  const [activePeriod, setActivePeriod] = useState<AuditPeriod | null>(null)
  const [allPeriods, setAllPeriods] = useState<AuditPeriod[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('audit_periods')
      .select('*')
      .order('start_date', { ascending: false })
    const periods = data && data.length > 0 ? data : demoAuditPeriods
    setAllPeriods(periods)
    setActivePeriod(periods.find(p => p.status === 'active') ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <AuditPeriodContext.Provider value={{ activePeriod, allPeriods, loading, refresh }}>
      {children}
    </AuditPeriodContext.Provider>
  )
}

export function useAuditPeriod() {
  const ctx = useContext(AuditPeriodContext)
  if (!ctx) throw new Error('useAuditPeriod must be used within AuditPeriodProvider')
  return ctx
}
