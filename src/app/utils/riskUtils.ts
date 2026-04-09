export type RiskLevel = 'Low' | 'Medium' | 'High'

export function calculateRiskScore(l: RiskLevel, i: RiskLevel): number {
  const values = { Low: 1, Medium: 2, High: 3 }
  const score = values[l] * values[i]
  if (score >= 7) return 9
  if (score >= 5) return 7
  if (score >= 3) return 5
  return score
}

export function getRiskScoreColor(score: number): string {
  if (score >= 7) return 'bg-red-100 text-red-700 border-red-200'
  if (score >= 4) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return 'bg-green-100 text-green-700 border-green-200'
}

export async function generateNextId(table: 'risks' | 'controls', prefix: 'R' | 'C'): Promise<string> {
  const { supabase } = await import('../../lib/supabase')
  const { data } = await supabase.from(table).select('id').order('id', { ascending: false }).limit(1)
  if (!data || data.length === 0) return `${prefix}001`
  const last = parseInt(data[0].id.replace(prefix, ''), 10)
  return `${prefix}${String(last + 1).padStart(3, '0')}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
