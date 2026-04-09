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
  Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Reminder } from '../../lib/types';

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReminderDialog({ open, onOpenChange }: ReminderDialogProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminderDays, setNewReminderDays] = useState('7');
  const [newReminderEmail, setNewReminderEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (open && user) {
      loadReminders();
      setNewReminderEmail(profile?.email ?? '');
    }
  }, [open, user]);

  const loadReminders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    setReminders(data || []);
  };

  const handleAddReminder = async () => {
    if (!newReminderDays || !newReminderEmail) { toast.error('Days and email are required'); return; }
    if (!user) { toast.error('Not logged in'); return; }
    setSaving(true);
    const { error } = await supabase.from('reminders').insert({
      user_id: user.id,
      email: newReminderEmail,
      days_before: parseInt(newReminderDays),
      email_enabled: true
    });
    if (error) { toast.error('Failed to add reminder'); }
    else { toast.success('Reminder added'); setNewReminderDays('7'); setNewReminderEmail(''); loadReminders(); }
    setSaving(false);
  };

  const handleDeleteReminder = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id);
    toast.success('Reminder deleted');
    loadReminders();
  };

  const handleToggleActive = async (reminder: Reminder) => {
    await supabase.from('reminders').update({ email_enabled: !reminder.email_enabled }).eq('id', reminder.id);
    loadReminders();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Control Reminders</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Automatic email notifications before control deadlines
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Active Reminders */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Your Reminders ({reminders.length})
            </h3>
            {reminders.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No reminders set yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`p-4 border rounded-lg transition-all ${
                      reminder.email_enabled
                        ? 'bg-white border-gray-200'
                        : 'bg-gray-50 border-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Mail className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              <Clock className="w-3 h-3 mr-1" />
                              {reminder.days_before} days before
                            </Badge>
                            <Badge variant="outline" className="text-xs">Email</Badge>
                            {!reminder.email_enabled && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">Disabled</Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">To: </span>{reminder.email}
                          </div>
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

          {/* Add New Reminder */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Add New Reminder</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="days" className="text-sm font-medium text-gray-700 mb-2">
                    Days Before Deadline
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      max="90"
                      value={newReminderDays}
                      onChange={(e) => setNewReminderDays(e.target.value)}
                      className="pl-10"
                      placeholder="7"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={newReminderEmail}
                      onChange={(e) => setNewReminderEmail(e.target.value)}
                      className="pl-10"
                      placeholder="name@simteq.no"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAddReminder}
                disabled={!newReminderDays || !newReminderEmail || saving}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {saving ? 'Adding...' : 'Add Reminder'}
              </Button>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Automatic Delivery</p>
                <p className="text-xs text-gray-600 mt-1">
                  Reminders are sent automatically based on control due dates.
                  Set multiple reminders at different intervals for important controls.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
