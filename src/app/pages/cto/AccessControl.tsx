import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../../components/ui/dialog'
import { Search, Users, UserPlus, Mail } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { Profile, RoleOption } from '../../../lib/types'
import { toast } from 'sonner'

const DEFAULT_ROLES: RoleOption[] = [
  { key: 'ceo', label: 'CEO', description: null, created_at: '' },
  { key: 'cto', label: 'CTO', description: null, created_at: '' },
  { key: 'qa', label: 'QA', description: null, created_at: '' },
]

const roleColor = (role: string) => {
  switch (role) {
    case 'ceo': return 'bg-blue-100 text-blue-700'
    case 'cto': return 'bg-slate-100 text-slate-700'
    case 'qa': return 'bg-green-100 text-green-700'
    default: return 'bg-slate-100 text-slate-700'
  }
}

export function AccessControl() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [roles, setRoles] = useState<RoleOption[]>(DEFAULT_ROLES)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('qa')
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [{ data, error }, { data: roleData, error: roleError }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('roles').select('*').order('label'),
    ])
    if (error) toast.error('Failed to load users')
    else setProfiles(data || [])
    if (!roleError && roleData && roleData.length > 0) setRoles(roleData)
    else setRoles(DEFAULT_ROLES)
    setLoading(false)
  }

  const filtered = profiles.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const roleName = (key: string) => roles.find(role => role.key === key)?.label || key

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) { toast.error('Failed to update role'); return }
    toast.success('Role updated')
    loadData()
  }

  const handleInvite = async () => {
    if (!inviteEmail) { toast.error('Email is required'); return }
    setInviteLoading(true)
    // In MVP we can't call admin.inviteUserByEmail from client-side
    // Show instructions instead
    toast.info('Invitation instructions', {
      description: `Create user ${inviteEmail} (role: ${inviteRole}) in Supabase Auth dashboard, then run seed.sql to set profile.`
    })
    setInviteOpen(false)
    setInviteEmail('')
    setInviteLoading(false)
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">Access Control</h1>
            <p className="text-xs text-slate-400 mt-2">User management and role audit trail</p>
          </div>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>
      <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto w-full">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500">Total Users</p>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{profiles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">CEO</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">{profiles.filter(p => p.role === 'ceo').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">CTO</p>
          <p className="text-2xl font-semibold text-slate-700 mt-1">{profiles.filter(p => p.role === 'cto').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500">QA</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{profiles.filter(p => p.role === 'qa').length}</p>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </Card>

      {/* Users List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-4 text-sm font-medium text-slate-700">User</th>
                <th className="text-left p-4 text-sm font-medium text-slate-700">Email</th>
                <th className="text-left p-4 text-sm font-medium text-slate-700">Role</th>
                <th className="text-left p-4 text-sm font-medium text-slate-700">Created</th>
                <th className="text-left p-4 text-sm font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No users found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-slate-600">
                          {p.full_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">{p.full_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-700">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {p.email ?? '—'}
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge className={`text-xs ${roleColor(p.role)}`}>{roleName(p.role)}</Badge>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-slate-700">{new Date(p.created_at).toLocaleDateString()}</span>
                  </td>
                  <td className="p-4">
                    <select
                      value={p.role}
                      onChange={e => handleChangeRole(p.id, e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {roles.map(role => (
                        <option key={role.key} value={role.key}>{role.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Create the user in Supabase Auth dashboard first, then run seed SQL to set their profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Email Address</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@simteq.no" className="pl-10" />
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {roles.map(role => (
                  <option key={role.key} value={role.key}>{role.label}</option>
                ))}
              </select>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <p className="font-medium">Instructions:</p>
              <ol className="mt-1 space-y-1 list-decimal list-inside text-xs">
                <li>Go to Supabase Auth dashboard</li>
                <li>Create user with the email above</li>
                <li>Set password: demo1234</li>
                <li>Run INSERT into profiles table with their user ID</li>
              </ol>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={inviteLoading}>
                <Users className="w-4 h-4 mr-2" />
                Send Instructions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
