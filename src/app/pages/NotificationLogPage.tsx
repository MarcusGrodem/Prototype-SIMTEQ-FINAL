import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { NotificationLogEntry } from '../../lib/types'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Mail, RefreshCw, Bell, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

const KIND_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  reminder: Bell,
  invite: UserPlus,
  manual: Mail,
}

const STATUS_COLOR: Record<string, string> = {
  mock: 'bg-amber-50 text-amber-700 border-amber-200',
  queued: 'bg-blue-50 text-blue-700 border-blue-200',
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

export function NotificationLogPage() {
  const [entries, setEntries] = useState<NotificationLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('notification_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) toast.error('Failed to load notifications')
    else setEntries(data || [])
    setLoading(false)
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Notification Log</h1>
            <p className="text-xs text-slate-400 mt-2">Recent reminders and invites recorded by the system</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="w-4 h-4" /> Refresh</Button>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 mb-4">
          <strong>Prototype:</strong> entries marked <code>mock</code> represent emails the system <em>would</em> send once the email backend is connected.
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : entries.length === 0 ? (
          <Card className="border-slate-200 shadow-none p-8 text-center text-sm text-slate-400">
            No notifications yet. Add a reminder or invite a user to see entries here.
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map(e => {
              const Icon = KIND_ICON[e.kind] || Mail
              return (
                <Card key={e.id} className="border-slate-200 shadow-none p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 truncate">{e.subject}</span>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLOR[e.status] || ''}`}>{e.status}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{e.kind}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 mb-2">To: {e.recipient_email} · {new Date(e.created_at).toLocaleString()}</div>
                      {e.body && (
                        <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans bg-slate-50 border border-slate-100 rounded p-2 max-h-32 overflow-y-auto">
                          {e.body}
                        </pre>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
