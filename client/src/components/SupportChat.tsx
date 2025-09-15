import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageCircle,
  Send,
  X,
  Minimize2,
  Maximize2,
  User,
  Bot,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'support' | 'system';
  timestamp: Date;
  type?: 'text' | 'canned_response' | 'escalation';
  metadata?: {
    ticketId?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: 'payroll' | 'ergani' | 'efka' | 'general';
  keywords: string[];
  priority: number;
}

const cannedResponses: CannedResponse[] = [
  {
    id: 'payroll-001',
    title: 'Σφάλμα Υπολογισμού Υπερωριών',
    content:
      'Για τη διόρθωση σφαλμάτων υπολογισμού υπερωριών: 1) Επαληθεύστε τις ώρες εργασίας στο σύστημα 2) Ελέγξτε τους συντελεστές υπερωρίας για τον κλάδο 3) Βεβαιωθείτε ότι εφαρμόζεται η σωστή συλλογική σύμβαση. Μπορείτε να διορθώσετε τα στοιχεία από Μισθοδοσία > Επεξεργασία Υπερωριών.',
    category: 'payroll',
    keywords: ['υπερωρία', 'υπολογισμός', 'λάθος', 'σφάλμα'],
    priority: 1,
  },
  {
    id: 'ergani-001',
    title: 'Αποτυχία Υποβολής ΕΡΓΑΝΗ',
    content:
      'Όταν αποτυγχάνει η υποβολή στην ΕΡΓΑΝΗ: 1) Ελέγξτε τη σύνδεση στο διαδίκτυο 2) Βεβαιωθείτε ότι τα πιστοποιητικά είναι ενεργά 3) Επαληθεύστε τα στοιχεία εργαζομένου (ΑΦΜ, ΑΜΚΑ) 4) Δοκιμάστε εκ νέου υποβολή. Εάν το πρόβλημα παραμένει, επικοινωνήστε με την τεχνική υποστήριξη.',
    category: 'ergani',
    keywords: ['εργανη', 'ergani', 'υποβολή', 'αποτυχία', 'σύνδεση'],
    priority: 1,
  },
  {
    id: 'ergani-002',
    title: 'Σφάλμα Ψηφιακής Κάρτας Εργασίας',
    content:
      'Για προβλήματα με ψηφιακές κάρτες εργασίας: 1) Βεβαιωθείτε ότι ο εργαζόμενος έχει εγγραφεί στο σύστημα 2) Ελέγξτε ότι τα προσωπικά στοιχεία είναι σωστά 3) Επαληθεύστε την ενεργή σύνδεση NFC/QR 4) Συγχρονίστε τα δεδομένα με την ΕΡΓΑΝΗ II. Οδηγός: Ψηφιακές Κάρτες > Διαχείριση.',
    category: 'ergani',
    keywords: ['κάρτα', 'εργασίας', 'ψηφιακή', 'nfc', 'qr'],
    priority: 2,
  },
  {
    id: 'efka-001',
    title: 'Σφάλμα Εισφορών ΕΦΚΑ',
    content:
      'Για σφάλματα στις εισφορές ΕΦΚΑ: 1) Ελέγξτε τα ποσοστά εισφορών (ενημερωμένα για 2025) 2) Επαληθεύστε τα μισθολογικά στοιχεία 3) Βεβαιωθείτε για τη σωστή κατηγοριοποίηση εργαζομένων 4) Ελέγξτε τα όρια ασφάλισης. Ενέργειες: Μισθοδοσία > Εισφορές ΕΦΚΑ > Επαναϋπολογισμός.',
    category: 'efka',
    keywords: ['εφκα', 'εισφορές', 'ασφάλιση', 'ποσοστά'],
    priority: 1,
  },
  {
    id: 'payroll-002',
    title: 'Πρόβλημα Φορολογικής Παρακράτησης',
    content:
      'Για διόρθωση φορολογικής παρακράτησης: 1) Ελέγξτε το αφορολόγητο όριο (€9.100 για 2025) 2) Επαληθεύστε τις κλίμακες φορολογίας 3) Βεβαιωθείτε για τυχόν εξαιρέσεις 4) Ελέγξτε τα στοιχεία Ε1 του εργαζομένου. Διόρθωση: Μισθοδοσία > Φορολογία > Ρυθμίσεις.',
    category: 'payroll',
    keywords: ['φορολογία', 'παρακράτηση', 'κλίμακα', 'αφορολόγητο'],
    priority: 2,
  },
];

const slaLevels = {
  urgent: { time: '1 ώρα', color: 'bg-red-100 text-red-800' },
  high: { time: '4 ώρες', color: 'bg-orange-100 text-orange-800' },
  medium: { time: '24 ώρες', color: 'bg-yellow-100 text-yellow-800' },
  low: { time: '3 εργάσιμες ημέρες', color: 'bg-green-100 text-green-800' },
};

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      content:
        'Γεια σας! Είμαι εδώ για να σας βοηθήσω με ερωτήσεις για το PayrollSync. Μπορείτε να περιγράψετε το πρόβλημά σας;',
      sender: 'system',
      timestamp: new Date(),
      type: 'text',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const findRelevantCannedResponse = (
    message: string
  ): CannedResponse | null => {
    const lowerMessage = message.toLowerCase();
    const scored = cannedResponses.map(response => {
      const score = response.keywords.reduce((acc, keyword) => {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return acc + response.priority;
        }
        return acc;
      }, 0);
      return { response, score };
    });

    const best = scored.find(item => item.score > 0);
    return best?.response || null;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Find relevant canned response
    const cannedResponse = findRelevantCannedResponse(inputMessage);

    if (cannedResponse) {
      const supportResponse: ChatMessage = {
        id: `support-${Date.now()}`,
        content: cannedResponse.content,
        sender: 'support',
        timestamp: new Date(),
        type: 'canned_response',
        metadata: {
          category: cannedResponse.category,
          priority: 'medium',
        },
      };
      setMessages(prev => [...prev, supportResponse]);
    } else {
      const genericResponse: ChatMessage = {
        id: `support-${Date.now()}`,
        content:
          'Σας ευχαριστώ για το μήνυμά σας. Ένας εξειδικευμένος σύμβουλος θα επικοινωνήσει μαζί σας εντός 4 ωρών. Εάν είναι επείγον, καλέστε στο +30 210 1234567.',
        sender: 'support',
        timestamp: new Date(),
        type: 'escalation',
        metadata: {
          ticketId: `TICKET-${Date.now()}`,
          priority: 'medium',
        },
      };
      setMessages(prev => [...prev, genericResponse]);
    }

    setIsTyping(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessageIcon = (sender: string, type?: string) => {
    if (sender === 'user') return <User className="w-4 h-4" />;
    if (type === 'canned_response') return <Bot className="w-4 h-4" />;
    if (type === 'escalation') return <AlertTriangle className="w-4 h-4" />;
    return <MessageCircle className="w-4 h-4" />;
  };

  const getSLABadge = (priority?: string) => {
    if (!priority) return null;
    const sla = slaLevels[priority as keyof typeof slaLevels];
    return <Badge className={`text-xs ${sla.color}`}>SLA: {sla.time}</Badge>;
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card
          className={`fixed bottom-6 right-6 w-96 shadow-xl z-50 transition-all ${
            isMinimized ? 'h-16' : 'h-[500px]'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">
                  Υποστήριξη PayrollSync
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription className="text-sm">
              Άμεση υποστήριξη για μισθοδοσία και ΕΡΓΑΝΗ
            </CardDescription>
          </CardHeader>

          {!isMinimized && (
            <>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-80 px-4">
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`flex gap-2 ${
                          message.sender === 'user'
                            ? 'flex-row-reverse'
                            : 'flex-row'
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            message.sender === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {getMessageIcon(message.sender, message.type)}
                        </div>

                        <div
                          className={`max-w-xs ${
                            message.sender === 'user'
                              ? 'text-right'
                              : 'text-left'
                          }`}
                        >
                          <div
                            className={`inline-block px-3 py-2 rounded-lg text-sm ${
                              message.sender === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {message.content}
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{formatTime(message.timestamp)}</span>
                            {message.metadata?.ticketId && (
                              <span>
                                #{message.metadata.ticketId.slice(-6)}
                              </span>
                            )}
                            {getSLABadge(message.metadata?.priority)}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex gap-2">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Bot className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="bg-muted px-3 py-2 rounded-lg">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                              style={{ animationDelay: '0.2s' }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"
                              style={{ animationDelay: '0.4s' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>
              </CardContent>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Περιγράψτε το πρόβλημά σας..."
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        sendMessage();
                      }
                    }}
                    disabled={isTyping}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isTyping || !inputMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>Συνδεδεμένος ως {user?.firstName || 'Χρήστης'}</span>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span>Online</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}
