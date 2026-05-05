import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Bell,
  Mail,
  Clock,
  Calendar,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Reminder, Control } from '../../lib/types';

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  control?: Control | null;
}

interface ReminderRow extends Reminder {
  control_id?: string | null;
  controls?: { id: string; title: string; next_due: string | null } | null;
  last_sent_at?: string | null;
}

export function ReminderDialog({ open, onOpenChange, control }: ReminderDialogProps) {
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [newReminderDays, setNewReminderDays] = useState('7');
  const [newReminderEmail, setNewReminderEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (open && user) {
      loadReminders();
      setNewReminderEmail(profile?.email ?? '');
    }
  }, [open, user, control?.id]);

  const loadReminders = async () => {
    if (!user) return;
    let q = supabase
      .from('reminders')
      .select('*, controls!reminders_control_id_fkey(id, title, next_due)')
      .eq('user_id', user.id);
    if (control) q = q.eq('control_id', control.id);
    const { data } = await q.order('created_at');
    setReminders((data as ReminderRow[] | null) || []);
  };

  const handleAddReminder = async () => {
    if (!newReminderDays || !newReminderEmail) { toast.error('Days and email are required'); return; }
    if (!user) { toast.error('Not logged in'); return; }
    setSaving(true);
    const days = parseInt(newReminderDays);
    const { data: inserted, error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        email: newReminderEmail,
        days_before: days,
        email_enabled: true,
        control_id: control?.id ?? null,
      })
      .select()
      .single();
    if (error) { toast.error('Failed to add reminder'); setSaving(false); return; }

    // Mock-log the email that *would* be sent
    await supabase.from('notification_log').insert({
      kind: 'reminder',
      recipient_email: newReminderEmail,
      subject: control
        ? `Reminder: control "${control.title}" is due in ${days} day(s)`
        : `Reminder configured (${days} days before deadlines)`,
      body: control
        ? `This is a scheduled reminder. Control ${control.id} – ${control.title} is due on ${control.next_due ?? 'an unspecified date'}. You requested ${days} day(s) advance notice.`
        : `Reminder created at ${new Date().toLocaleString()}. You will receive an email ${days} day(s) before each control's due date.`,
      related_type: control ? 'control' : null,
      related_id: control?.id ?? null,
      status: 'mock',
    });

    toast.success('Reminder added', {
      description: 'A mock notification has been logged. Real email delivery is wired in production.',
    });
    setNewReminderDays('7');
    setNewReminderEmail(profile?.email ?? '');
    if (inserted) loadReminders();
    setSaving(false);
  };

  const handleDeleteReminder = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id);
    toast.success('Reminder deleted');
    loadReminders();
  };

  const handleToggleActive = async (reminder: ReminderRow) => {
    await supabase.from('reminders').update({ email_enabled: !reminder.email_enabled }).eq('id', reminder.id);
    loadReminders();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>{control ? `Reminders for ${control.id}` : 'Control Reminders'}</DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-1">
                {control ? `Email notifications before "${control.title}" is due.` : 'Email notifications before any control deadline.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Prototype:</strong> reminders are stored, but the email backend is not yet connected.
              Each new reminder writes a mock entry to the notification log so the intended message is visible for review.
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Active reminders ({reminders.length})</h3>
            {reminders.length === 0 ? (
              <div className="text-center py-5 rounded-lg border border-slate-100 bg-slate-50">
                <p className="text-sm font-medium text-slate-600">No reminders set</p>
                <p className="text-xs text-slate-400 mt-1">Add one below to receive an email before this control is due.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`p-4 border rounded-lg transition-all ${
                      reminder.email_enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Mail className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              <Clock className="w-3 h-3 mr-1" />
                              {reminder.days_before} days before
                            </Badge>
                            {reminder.controls?.id && (
                              <Badge variant="outline" className="text-xs">
                                {reminder.controls.id} · {reminder.controls.title}
                              </Badge>
                            )}
                            {!reminder.email_enabled && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">Disabled</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">To: </span>{reminder.email}
                          </div>
                          {reminder.last_sent_at && (
                            <div className="text-[11px] text-gray-400 mt-1">Last sent {new Date(reminder.last_sent_at).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(reminder)} className="text-xs">
                          {reminder.email_enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteReminder(reminder.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Add new reminder</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="days" className="text-sm font-medium text-gray-700 mb-2">Days before deadline</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="days" type="number" min="1" max="90" value={newReminderDays} onChange={(e) => setNewReminderDays(e.target.value)} className="pl-10" placeholder="7" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input id="email" type="email" value={newReminderEmail} onChange={(e) => setNewReminderEmail(e.target.value)} className="pl-10" placeholder="name@example.com" />
                  </div>
                </div>
              </div>

              <Button onClick={handleAddReminder} disabled={!newReminderDays || !newReminderEmail || saving} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                {saving ? 'Adding…' : 'Add reminder'}
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">How delivery works</p>
                <p className="text-xs text-gray-600 mt-1">
                  In production, a daily job inspects all active reminders and triggers an email when a control is within the configured window.
                  In this prototype, each reminder is logged as a mock send so you can preview the message body in the notification log.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
