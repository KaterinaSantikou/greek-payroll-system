import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Users,
  FileText,
  Calculator,
  Calendar,
  Settings,
  ArrowRight,
  Command
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  action: () => void;
  icon: React.ReactNode;
  category: string;
}

export function CommandPaletteModal({ isOpen, onClose }: CommandPaletteProps) {
  const { locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);

  const commands: Command[] = [
    {
      id: 'run-payroll',
      title: locale === 'el' ? 'Εκτέλεση Μισθοδοσίας' : 'Run Payroll',
      subtitle: locale === 'el' ? 'Ξεκίνα νέα μισθοδοσία' : 'Start new payroll run',
      action: () => console.log('Run payroll'),
      icon: <Calculator className="h-4 w-4" />,
      category: locale === 'el' ? 'Μισθοδοσία' : 'Payroll'
    },
    {
      id: 'view-employees',
      title: locale === 'el' ? 'Προβολή Εργαζομένων' : 'View Employees',
      subtitle: locale === 'el' ? 'Διαχείριση εργαζομένων' : 'Manage employee data',
      action: () => console.log('View employees'),
      icon: <Users className="h-4 w-4" />,
      category: locale === 'el' ? 'Άνθρωποι' : 'People'
    },
    {
      id: 'ergani-sync',
      title: locale === 'el' ? 'Συγχρονισμός ΕΡΓΑΝΗ' : 'ERGANI Sync',
      subtitle: locale === 'el' ? 'Ανεβάστε στο ΕΡΓΑΝΗ ΙΙ' : 'Upload to ERGANI II',
      action: () => console.log('ERGANI sync'),
      icon: <FileText className="h-4 w-4" />,
      category: locale === 'el' ? 'Συμμόρφωση' : 'Compliance'
    },
    {
      id: 'view-schedule',
      title: locale === 'el' ? 'Προβολή Προγράμματος' : 'View Schedule',
      subtitle: locale === 'el' ? 'Διαχείριση προγραμμάτων' : 'Manage schedules',
      action: () => console.log('View schedule'),
      icon: <Calendar className="h-4 w-4" />,
      category: locale === 'el' ? 'Χρόνος' : 'Time'
    },
    {
      id: 'settings',
      title: locale === 'el' ? 'Ρυθμίσεις' : 'Settings',
      subtitle: locale === 'el' ? 'Ρύθμιση εφαρμογής' : 'Configure application',
      action: () => console.log('Settings'),
      icon: <Settings className="h-4 w-4" />,
      category: locale === 'el' ? 'Σύστημα' : 'System'
    }
  ];

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCommands(commands);
    } else {
      const filtered = commands.filter(cmd =>
        cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCommands(filtered);
    }
  }, [searchQuery, locale]);

  const handleCommandSelect = (command: Command) => {
    command.action();
    onClose();
    setSearchQuery('');
  };

  const handleKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0" onKeyDown={handleKeydown}>
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <Command className="h-4 w-4" />
            {locale === 'el' ? 'Παλέτα Εντολών' : 'Command Palette'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={locale === 'el' ? 'Αναζήτηση εντολών...' : 'Search commands...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 shadow-none text-lg h-12 focus-visible:ring-0"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto border-t">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {locale === 'el' ? 'Δεν βρέθηκαν αποτελέσματα' : 'No results found'}
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(
                filteredCommands.reduce((acc, cmd) => {
                  if (!acc[cmd.category]) acc[cmd.category] = [];
                  acc[cmd.category].push(cmd);
                  return acc;
                }, {} as Record<string, Command[]>)
              ).map(([category, commands]) => (
                <div key={category} className="mb-2">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {category}
                  </div>
                  {commands.map((command) => (
                    <Button
                      key={command.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => handleCommandSelect(command)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-shrink-0">
                          {command.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{command.title}</div>
                          {command.subtitle && (
                            <div className="text-sm text-gray-500 truncate">
                              {command.subtitle}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border rounded text-xs">↵</kbd>
                <span>{locale === 'el' ? 'Εκτέλεση' : 'Execute'}</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border rounded text-xs">Esc</kbd>
                <span>{locale === 'el' ? 'Κλείσιμο' : 'Close'}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}