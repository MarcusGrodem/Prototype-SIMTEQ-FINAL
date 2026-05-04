import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { RiskCategory } from '../../lib/types'

export function useCategories() {
  const [categories, setCategories] = useState<RiskCategory[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('risk_categories')
      .select('*')
      .order('name')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { categories, loading, reload: load }
}
