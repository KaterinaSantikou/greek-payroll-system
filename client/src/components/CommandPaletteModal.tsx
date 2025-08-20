import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Command,
  History,
  Clock,
  User,
  Building,
  Euro,
  X
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

// Enhanced search suggestions data
interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string;
  type: 'employee' | 'payroll' | 'filing' | 'action' | 'property';
  icon: React.ReactNode;
  category: string;
  searchTerms: string[];
}

interface RecentSearch {
  id: string;
  query: string;
  timestamp: number;
  resultType: string;
}

export function CommandPaletteModal({ isOpen, onClose }: CommandPaletteProps) {
  const { locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('payroll-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (query: string, resultType: string) => {
    if (query.trim().length < 2) return;
    
    const newSearch: RecentSearch = {
      id: Date.now().toString(),
      query: query.trim(),
      timestamp: Date.now(),
      resultType
    };
    
    const updated = [newSearch, ...recentSearches.filter(s => s.query !== query.trim())].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('payroll-recent-searches', JSON.stringify(updated));
  };

  // Enhanced search suggestions
  const searchSuggestions: SearchSuggestion[] = [
    // Employees
    {
      id: 'emp-maria-papadopoulos',
      title: 'Maria Papadopoulos',
      subtitle: locale === 'el' ? 'Υπεύθυνη Υποδοχής' : 'Front Desk Manager',
      type: 'employee',
      icon: <User className="h-4 w-4" />,
      category: locale === 'el' ? 'Εργαζόμενοι' : 'Employees',
      searchTerms: ['maria', 'papadopoulos', 'front', 'desk', 'manager', 'reception']
    },
    {
      id: 'emp-dimitris-kostas',
      title: 'Dimitris Kostas',
      subtitle: locale === 'el' ? 'Chef' : 'Head Chef',
      type: 'employee',
      icon: <User className="h-4 w-4" />,
      category: locale === 'el' ? 'Εργαζόμενοι' : 'Employees',
      searchTerms: ['dimitris', 'kostas', 'chef', 'kitchen', 'head']
    },
    // Payroll runs
    {
      id: 'payroll-december-2024',
      title: locale === 'el' ? 'Μισθοδοσία Δεκεμβρίου 2024' : 'December 2024 Payroll',
      subtitle: '€124,280 • 127 employees',
      type: 'payroll',
      icon: <Euro className="h-4 w-4" />,
      category: locale === 'el' ? 'Μισθοδοσία' : 'Payroll',
      searchTerms: ['december', 'δεκέμβριος', '2024', 'payroll', 'μισθοδοσία', '124280']
    },
    // Properties
    {
      id: 'property-princess',
      title: 'Princess Hotel',
      subtitle: locale === 'el' ? 'Κύρια ιδιοκτησία' : 'Main property',
      type: 'property',
      icon: <Building className="h-4 w-4" />,
      category: locale === 'el' ? 'Ιδιοκτησίες' : 'Properties',
      searchTerms: ['princess', 'hotel', 'property', 'main']
    }
  ];

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

  // Enhanced filtering logic
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (query === '') {
      setFilteredCommands(commands);
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(0);
    } else {
      // Filter commands
      const filteredCmds = commands.filter(cmd =>
        cmd.title.toLowerCase().includes(query) ||
        cmd.subtitle?.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query)
      );
      setFilteredCommands(filteredCmds);
      
      // Filter suggestions with fuzzy matching
      const filteredSugs = searchSuggestions.filter(suggestion =>
        suggestion.searchTerms.some(term => term.toLowerCase().includes(query)) ||
        suggestion.title.toLowerCase().includes(query) ||
        suggestion.subtitle?.toLowerCase().includes(query)
      ).slice(0, 6); // Limit to 6 suggestions
      
      setFilteredSuggestions(filteredSugs);
      setShowSuggestions(query.length >= 1);
      setSelectedIndex(0);
    }
  }, [searchQuery, locale]);

  const handleCommandSelect = (command: Command) => {
    saveRecentSearch(searchQuery, 'command');
    command.action();
    onClose();
    setSearchQuery('');
  };
  
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    saveRecentSearch(suggestion.title, suggestion.type);
    console.log('Selected suggestion:', suggestion);
    onClose();
    setSearchQuery('');
  };
  
  const handleRecentSearchSelect = (recentSearch: RecentSearch) => {
    setSearchQuery(recentSearch.query);
    inputRef.current?.focus();
  };
  
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('payroll-recent-searches');
  };
  
  const removeRecentSearch = (id: string) => {
    const updated = recentSearches.filter(s => s.id !== id);
    setRecentSearches(updated);
    localStorage.setItem('payroll-recent-searches', JSON.stringify(updated));
  };

  const handleKeydown = (e: React.KeyboardEvent) => {
    const totalItems = filteredCommands.length + filteredSuggestions.length;
    
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredSuggestions.length) {
        handleSuggestionSelect(filteredSuggestions[selectedIndex]);
      } else {
        const commandIndex = selectedIndex - filteredSuggestions.length;
        if (filteredCommands[commandIndex]) {
          handleCommandSelect(filteredCommands[commandIndex]);
        }
      }
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
              ref={inputRef}
              placeholder={locale === 'el' ? 'Αναζήτηση εργαζομένων, μισθοδοσίας, εντολών...' : 'Search employees, payroll, commands...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 shadow-none text-lg h-12 focus-visible:ring-0"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto border-t">
          {/* Recent searches when no query */}
          {searchQuery.trim() === '' && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <History className="h-3 w-3" />
                  {locale === 'el' ? 'Πρόσφατες Αναζητήσεις' : 'Recent Searches'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                  onClick={clearRecentSearches}
                >
                  {locale === 'el' ? 'Καθαρισμός' : 'Clear'}
                </Button>
              </div>
              {recentSearches.slice(0, 5).map((recentSearch) => (
                <Button
                  key={recentSearch.id}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 group"
                  onClick={() => handleRecentSearchSelect(recentSearch)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{recentSearch.query}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {recentSearch.resultType} • {new Date(recentSearch.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(recentSearch.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </Button>
              ))}
            </div>
          )}
          
          {/* Search results */}
          {searchQuery.trim() !== '' && (
            <>
              {/* Suggestions section */}
              {filteredSuggestions.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Search className="h-3 w-3" />
                    {locale === 'el' ? 'Προτάσεις' : 'Suggestions'}
                  </div>
                  {filteredSuggestions.map((suggestion, index) => (
                    <Button
                      key={suggestion.id}
                      variant="ghost"
                      className={`w-full justify-start h-auto p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                      }`}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-shrink-0">
                          {suggestion.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{suggestion.title}</div>
                          {suggestion.subtitle && (
                            <div className="text-sm text-gray-500 truncate">
                              {suggestion.subtitle}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.category}
                        </Badge>
                      </div>
                    </Button>
                  ))}
                  {filteredCommands.length > 0 && <Separator className="my-2" />}
                </div>
              )}
              
              {/* Commands section */}
              {filteredCommands.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Command className="h-3 w-3" />
                    {locale === 'el' ? 'Εντολές' : 'Commands'}
                  </div>
                  {Object.entries(
                    filteredCommands.reduce((acc, cmd) => {
                      if (!acc[cmd.category]) acc[cmd.category] = [];
                      acc[cmd.category].push(cmd);
                      return acc;
                    }, {} as Record<string, Command[]>)
                  ).map(([category, commands]) => (
                    <div key={category} className="mb-2">
                      {commands.map((command, cmdIndex) => {
                        const globalIndex = filteredSuggestions.length + Object.values(
                          filteredCommands.reduce((acc, cmd, idx) => {
                            if (idx < filteredCommands.indexOf(command)) {
                              const cat = cmd.category;
                              if (!acc[cat]) acc[cat] = 0;
                              acc[cat]++;
                            }
                            return acc;
                          }, {} as Record<string, number>)
                        ).reduce((sum, count) => sum + count, 0);
                        
                        return (
                          <Button
                            key={command.id}
                            variant="ghost"
                            className={`w-full justify-start h-auto p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 ${
                              globalIndex + cmdIndex === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                            }`}
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
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : filteredSuggestions.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  {locale === 'el' ? 'Δεν βρέθηκαν αποτελέσματα' : 'No results found'}
                  <div className="text-sm mt-1">
                    {locale === 'el' ? 'Δοκιμάστε διαφορετικούς όρους' : 'Try different search terms'}
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Show all commands when no search query */}
          {searchQuery.trim() === '' && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <Command className="h-3 w-3" />
                {locale === 'el' ? 'Συχνές Εντολές' : 'Quick Actions'}
              </div>
              {Object.entries(
                commands.reduce((acc, cmd) => {
                  if (!acc[cmd.category]) acc[cmd.category] = [];
                  acc[cmd.category].push(cmd);
                  return acc;
                }, {} as Record<string, Command[]>)
              ).map(([category, categoryCommands]) => (
                <div key={category} className="mb-2">
                  {categoryCommands.map((command) => (
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