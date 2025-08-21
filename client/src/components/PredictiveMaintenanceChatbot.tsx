import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Bot, User, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  attachments?: string[];
}

interface MaintenanceInsight {
  type: 'prediction' | 'recommendation' | 'alert' | 'schedule';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  suggestedAction?: string;
  estimatedTime?: string;
  estimatedCost?: string;
}

export function PredictiveMaintenanceChatbot() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'bot',
      content: 'Hello! I\'m your AI-powered predictive maintenance assistant. I can help you with equipment diagnostics, preventive maintenance scheduling, cost predictions, and facility optimization. What would you like assistance with today?',
      timestamp: new Date(),
      category: 'greeting'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [insights, setInsights] = useState<MaintenanceInsight[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/maintenance/chat', {
        message,
        context: {
          messageHistory: messages.slice(-5), // Send last 5 messages for context
          currentInsights: insights
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      const botMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'bot',
        content: data.response,
        timestamp: new Date(),
        priority: data.priority,
        category: data.category
      };

      setMessages(prev => [...prev, botMessage]);

      // Update insights if provided
      if (data.insights) {
        setInsights(data.insights);
      }

      // Show toast for high priority responses
      if (data.priority === 'high' || data.priority === 'critical') {
        toast({
          title: 'Important Maintenance Alert',
          description: 'The AI has identified a high-priority maintenance issue. Please review the recommendations.',
          variant: data.priority === 'critical' ? 'destructive' : 'default',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Chat Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
      console.error('Chat error:', error);
    }
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || sendMessage.isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessage.mutate(inputValue);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-900';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-900';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'low': return 'bg-green-100 border-green-300 text-green-900';
      default: return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction': return <AlertTriangle className="h-4 w-4" />;
      case 'recommendation': return <Wrench className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      case 'schedule': return <Clock className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            {t('Predictive Maintenance AI Assistant', 'Predictive Maintenance AI Assistant')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {message.type === 'user' ? (
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white ml-12'
                        : `bg-gray-100 text-gray-900 mr-12 ${message.priority ? getPriorityColor(message.priority) : ''}`
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      {message.content}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.priority && (
                        <Badge variant="secondary" className="text-xs">
                          {message.priority.toUpperCase()}
                        </Badge>
                      )}
                      {message.category && (
                        <Badge variant="outline" className="text-xs">
                          {message.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">AI is analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('Ask about equipment diagnostics, maintenance schedules, or cost predictions...', 'Ask about equipment diagnostics, maintenance schedules, or cost predictions...')}
                disabled={sendMessage.isPending}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || sendMessage.isPending}
                size="icon"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {t('Try asking about: HVAC diagnostics, preventive scheduling, cost analysis, equipment lifecycle', 'Try asking about: HVAC diagnostics, preventive scheduling, cost analysis, equipment lifecycle')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights Panel */}
      <Card className="w-80">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4" />
            {t('Maintenance Insights', 'Maintenance Insights')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            {insights.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t('AI insights will appear here as you chat', 'AI insights will appear here as you chat')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      insight.severity === 'error'
                        ? 'bg-red-50 border-red-400'
                        : insight.severity === 'warning'
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-blue-50 border-blue-400'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                        {insight.suggestedAction && (
                          <div className="mt-2 p-2 bg-white rounded border text-xs">
                            <strong>Action:</strong> {insight.suggestedAction}
                          </div>
                        )}
                        {(insight.estimatedTime || insight.estimatedCost) && (
                          <div className="flex gap-2 mt-2">
                            {insight.estimatedTime && (
                              <Badge variant="outline" className="text-xs">
                                ⏱ {insight.estimatedTime}
                              </Badge>
                            )}
                            {insight.estimatedCost && (
                              <Badge variant="outline" className="text-xs">
                                💰 {insight.estimatedCost}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}