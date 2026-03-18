import { useState } from 'react';
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

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Reminder {
  id: string;
  type: 'email' | 'notification';
  daysBeforeDeadline: number;
  recipients: string[];
  active: boolean;
}

export function ReminderDialog({ open, onOpenChange }: ReminderDialogProps) {
  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: '1',
      type: 'email',
      daysBeforeDeadline: 7,
      recipients: ['lars.hansen@simteq.no', 'anna.johansen@simteq.no'],
      active: true
    },
    {
      id: '2',
      type: 'email',
      daysBeforeDeadline: 3,
      recipients: ['lars.hansen@simteq.no'],
      active: true
    },
    {
      id: '3',
      type: 'notification',
      daysBeforeDeadline: 1,
      recipients: ['All control owners'],
      active: true
    }
  ]);

  const [newReminderDays, setNewReminderDays] = useState('14');
  const [newReminderEmail, setNewReminderEmail] = useState('');

  const handleAddReminder = () => {
    if (newReminderDays && newReminderEmail) {
      const newReminder: Reminder = {
        id: Date.now().toString(),
        type: 'email',
        daysBeforeDeadline: parseInt(newReminderDays),
        recipients: [newReminderEmail],
        active: true
      };
      setReminders([...reminders, newReminder]);
      setNewReminderDays('14');
      setNewReminderEmail('');
    }
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setReminders(reminders.map(r => 
      r.id === id ? { ...r, active: !r.active } : r
    ));
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
                Automatic notifications before control deadlines
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Active Reminders */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Active Reminders</h3>
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`p-4 border rounded-lg transition-all ${
                    reminder.active 
                      ? 'bg-white border-gray-200' 
                      : 'bg-gray-50 border-gray-100 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        reminder.type === 'email' 
                          ? 'bg-purple-100' 
                          : 'bg-blue-100'
                      }`}>
                        {reminder.type === 'email' ? (
                          <Mail className={`w-4 h-4 ${
                            reminder.type === 'email' ? 'text-purple-600' : 'text-blue-600'
                          }`} />
                        ) : (
                          <Bell className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                            <Clock className="w-3 h-3 mr-1" />
                            {reminder.daysBeforeDeadline} days before
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {reminder.type === 'email' ? 'Email' : 'Notification'}
                          </Badge>
                          {!reminder.active && (
                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Recipients: </span>
                          {reminder.recipients.join(', ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(reminder.id)}
                        className="text-xs"
                      >
                        {reminder.active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReminder(reminder.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                      placeholder="14"
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
                disabled={!newReminderDays || !newReminderEmail}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Reminder
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
                  Reminders are sent automatically to specified recipients based on control due dates. 
                  Control owners always receive notifications 3 days before deadlines.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}