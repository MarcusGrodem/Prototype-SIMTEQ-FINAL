import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Profile, RoleOption } from '../../lib/types'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog'
import { Plus, Pencil, Mail, ShieldAlert, Copy, Check, ShieldPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'

const DEFAULT_ROLES: RoleOption[] = [
  { key: 'ceo', label: 'CEO', description: 'Executive view and user administration', created_at: '' },
  { key: 'cto', label: 'CTO', description: 'Technical controls, releases, and access oversight', created_at: '' },
  { key: 'qa', label: 'QA', description: 'Quality assurance and evidence operations', created_at: '' },
]

const ROLE_COLOR: Record<string, string> = {
  ceo: 'bg-blue-50 text-blue-700 border-blue-200',
  cto: 'bg-purple-50 text-purple-700 border-purple-200',
  qa:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  auditor: 'bg-amber-50 text-amber-700 border-amber-200',
}

function roleKeyFromLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function generateTempPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let pwd = ''
  for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd + '!9'
}

export function UserManagementPage() {
  const { profile: me } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [roles, setRoles] = useState<RoleOption[]>(DEFAULT_ROLES)
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  // invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('qa')
  const [inviteDept, setInviteDept] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // role form
  const [roleLabel, setRoleLabel] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [roleSaving, setRoleSaving] = useState(false)

  // edit form
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('qa')
  const [editDept, setEditDept] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [{ data, error }, { data: roleData, error: roleError }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('roles').select('*').order('label'),
    ])
    if (error) toast.error('Failed to load users')
    else setUsers(data || [])

    if (!roleError && roleData && roleData.length > 0) {
      setRoles(roleData)
    } else {
      setRoles(DEFAULT_ROLES)
    }
    setLoading(false)
  }

  const roleName = (key: string) => roles.find(r => r.key === key)?.label || key
  const roleColor = (key: string) => ROLE_COLOR[key] || 'bg-slate-50 text-slate-700 border-slate-200'

  const handleCreateRole = async () => {
    if (!roleLabel.trim()) { toast.error('Role name is required'); return }
    const key = roleKeyFromLabel(roleLabel)
    if (!key) { toast.error('Role name must contain letters or numbers'); return }
    if (roles.some(r => r.key === key)) { toast.error('Role already exists'); return }

    setRoleSaving(true)
    const row = { key, label: roleLabel.trim(), description: roleDescription.trim() || null }
    const { error } = await supabase.from('roles').insert(row)
    if (error) { toast.error(error.message); setRoleSaving(false); return }

    toast.success('Role created')
    setRoles(prev => [...prev, { ...row, created_at: new Date().toISOString() }].sort((a, b) => a.label.localeCompare(b.label)))
    setInviteRole(key)
    setRoleLabel('')
    setRoleDescription('')
    setRoleSaving(false)
    setRoleOpen(false)
  }

  const handleCreate = async () => {
    if (!inviteEmail.trim()) { toast.error('Email is required'); return }
    if (!inviteName.trim()) { toast.error('Full name is required'); return }
    setCreating(true)

    const tempPassword = generateTempPassword()
    const { data, error } = await supabase.auth.signUp({
      email: inviteEmail.trim(),
      password: tempPassword,
      options: {
        data: {
          full_name: inviteName.trim(),
          role: inviteRole,
        },
      },
    })

    if (error) { toast.error(error.message); setCreating(false); return }

    // Trigger handle_new_user inserts the profile; ensure role + dept are set as requested.
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ role: inviteRole, full_name: inviteName.trim(), department: inviteDept || null })
        .eq('id', data.user.id)

      // Mock-log the invite "email"
      await supabase.from('notification_log').insert({
        kind: 'invite',
        recipient_email: inviteEmail.trim(),
        subject: 'Welcome to ComplianceOS',
        body: `Hi ${inviteName.trim()},\n\nYour account has been created with role ${roleName(inviteRole)}. Sign in at the ComplianceOS portal with the temporary password your administrator will share, then set a new password from your account settings.`,
        related_type: 'user',
        related_id: data.user.id,
        status: 'mock',
      })
    }

    setCreatedCreds({ email: inviteEmail.trim(), password: tempPassword })
    setCreating(false)
    setInviteEmail('')
    setInviteName('')
    setInviteDept('')
    setInviteRole('qa')
    load()
  }

  const handleCopyCreds = async () => {
    if (!createdCreds) return
    await navigator.clipboard.writeText(`Email: ${createdCreds.email}\nTemporary password: ${createdCreds.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const closeInvite = () => {
    setInviteOpen(false)
    setCreatedCreds(null)
  }

  const openEdit = (u: Profile) => {
    setEditing(u)
    setEditName(u.full_name)
    setEditRole(u.role || 'qa')
    setEditDept(u.department || '')
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!editing) return
    if (!editName.trim()) { toast.error('Name is required'); return }
    setEditSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName.trim(), role: editRole, department: editDept || null })
      .eq('id', editing.id)
    if (error) { toast.error(error.message); setEditSaving(false); return }
    toast.success('User updated')
    setEditSaving(false)
    setEditOpen(false)
    load()
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-none">User Management</h1>
            <p className="text-xs text-slate-400 mt-2">Invite users and manage roles</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRoleOpen(true)} className="border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 gap-1.5">
              <ShieldPlus className="w-4 h-4" /> New role
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5">
              <Plus className="w-4 h-4" /> New user
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <Card className="border-slate-200 shadow-none overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center text-sm text-slate-400 py-10">Loading…</td></tr>
              ) : users.map(u => {
                const initials = u.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-[11px] font-semibold text-slate-700">{initials}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{u.full_name}</p>
                          {u.id === me?.id && <p className="text-[11px] text-slate-400">that&apos;s you</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${roleColor(u.role)}`}>{roleName(u.role)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.department || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 tabular-nums">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(u)}><Pencil className="w-4 h-4 text-slate-500" /></Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        <p className="text-xs text-slate-400 mt-4">
          New users receive a temporary password generated here. Share it securely; the user can change it after first sign-in via the auth provider.
          A real production setup would replace this with an emailed invite link.
        </p>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!o) closeInvite(); else setInviteOpen(true) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{createdCreds ? 'User created' : 'Invite a new user'}</DialogTitle>
            <DialogDescription>
              {createdCreds ? 'Share these credentials with the user. They should change the password after first sign-in.' : 'Create a user account and assign a role.'}
            </DialogDescription>
          </DialogHeader>

          {!createdCreds ? (
            <div className="space-y-4 mt-2">
              <div>
                <Label htmlFor="i-email">Email *</Label>
                <Input id="i-email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="mt-1.5" placeholder="name@example.com" />
              </div>
              <div>
                <Label htmlFor="i-name">Full name *</Label>
                <Input id="i-name" value={inviteName} onChange={e => setInviteName(e.target.value)} className="mt-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="i-role">Role</Label>
                  <select
                    id="i-role"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map(role => (
                      <option key={role.key} value={role.key}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="i-dept">Department</Label>
                  <Input id="i-dept" value={inviteDept} onChange={e => setInviteDept(e.target.value)} className="mt-1.5" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={closeInvite}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  <Mail className="w-4 h-4 mr-1.5" />
                  {creating ? 'Creating…' : 'Create user'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                Account created. The Supabase trigger has provisioned a profile row.
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Email</Label>
                <code className="block w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-mono">{createdCreds.email}</code>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Temporary password</Label>
                <code className="block w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-mono break-all">{createdCreds.password}</code>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2 text-xs text-amber-900">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>This password is shown only once. Copy it now and share it through a secure channel.</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" onClick={handleCopyCreds}>
                  {copied ? <><Check className="w-4 h-4 mr-1.5" /> Copied</> : <><Copy className="w-4 h-4 mr-1.5" /> Copy</>}
                </Button>
                <Button onClick={closeInvite}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create role</DialogTitle>
            <DialogDescription>Add a role that can be assigned to users.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="r-label">Role name *</Label>
              <Input
                id="r-label"
                value={roleLabel}
                onChange={e => setRoleLabel(e.target.value)}
                className="mt-1.5"
                placeholder="Auditor"
              />
              {roleLabel.trim() && (
                <p className="text-[11px] text-slate-400 mt-1">Key: {roleKeyFromLabel(roleLabel)}</p>
              )}
            </div>
            <div>
              <Label htmlFor="r-desc">Description</Label>
              <Input
                id="r-desc"
                value={roleDescription}
                onChange={e => setRoleDescription(e.target.value)}
                className="mt-1.5"
                placeholder="External audit reviewer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setRoleOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={roleSaving}>
              <ShieldPlus className="w-4 h-4 mr-1.5" />
              {roleSaving ? 'Creating...' : 'Create role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update name, role, and department.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="e-name">Full name *</Label>
              <Input id="e-name" value={editName} onChange={e => setEditName(e.target.value)} className="mt-1.5" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="e-role">Role</Label>
                <select
                  id="e-role"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={editing?.id === me?.id}
                >
                  {roles.map(role => (
                    <option key={role.key} value={role.key}>{role.label}</option>
                  ))}
                </select>
                {editing?.id === me?.id && <p className="text-[11px] text-slate-400 mt-1">You can&apos;t change your own role.</p>}
              </div>
              <div>
                <Label htmlFor="e-dept">Department</Label>
                <Input id="e-dept" value={editDept} onChange={e => setEditDept(e.target.value)} className="mt-1.5" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
