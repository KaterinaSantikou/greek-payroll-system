import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Bot, Send, Lightbulb, AlertTriangle, CheckCircle, 
  Clock, Users, Euro, FileText, Zap 
} from "lucide-react";
import { useProperty } from "@/contexts/PropertyContext";
import { useUserRole } from "@/contexts/UserRoleContext";

interface AIQuery {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
  confidence: number;
  citations: string[];
  actionable: boolean;
}

interface ProactiveAlert {
  id: string;
  type: 'warning' | 'suggestion' | 'compliance';
  title: string;
  description: string;
  property?: string;
  department?: string;
  priority: 'low' | 'medium' | 'high';
  data: any;
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

export function AICopilot() {
  const [query, setQuery] = useState("");
  const [queryHistory, setQueryHistory] = useState<AIQuery[]>([]);
  const { selectedProperty } = useProperty();
  const { userProfile, hasPermission } = useUserRole();

  // Get proactive alerts
  const { data: proactiveAlerts = [] } = useQuery<ProactiveAlert[]>({
    queryKey: ["/api/ai/proactive-alerts", selectedProperty?.propertyId],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // AI Query mutation
  const queryMutation = useMutation({
    mutationFn: async (userQuery: string) => {
      const response = await apiRequest("/api/ai/query", "POST", { 
        query: userQuery,
        propertyId: selectedProperty?.propertyId,
        userRole: userProfile?.role,
        context: {
          department: userProfile?.department,
          permissions: userProfile?.permissions || []
        }
      });
      return response;
    },
    onSuccess: (response: any) => {
      const newQuery: AIQuery = {
        id: Date.now().toString(),
        query,
        response: response.answer || "No response received",
        timestamp: new Date(),
        confidence: response.confidence || 0.85,
        citations: response.citations || [],
        actionable: response.actionable || false
      };
      setQueryHistory(prev => [newQuery, ...prev.slice(0, 9)]); // Keep last 10
      setQuery("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      queryMutation.mutate(query.trim());
    }
  };

  const getAlertIcon = (type: string, priority: string) => {
    if (priority === 'high') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (type === 'suggestion') return <Lightbulb className="w-4 h-4 text-yellow-500" />;
    if (type === 'compliance') return <CheckCircle className="w-4 h-4 text-blue-500" />;
    return <AlertTriangle className="w-4 h-4 text-orange-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">AI Copilot</h2>
            <p className="text-sm text-muted-foreground">
              Natural language queries and proactive insights
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          <Zap className="w-3 h-3 mr-1" />
          Powered by Claude
        </Badge>
      </div>

      {/* Proactive Alerts */}
      {proactiveAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span>Proactive Alerts</span>
            </CardTitle>
            <CardDescription>
              AI-detected issues and recommendations for your attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {proactiveAlerts.slice(0, 3).map((alert) => (
              <Alert key={alert.id} className={`
                ${alert.priority === 'high' ? 'border-red-200 bg-red-50' : 
                  alert.priority === 'medium' ? 'border-orange-200 bg-orange-50' : 
                  'border-gray-200 bg-gray-50'}
              `}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type, alert.priority)}
                    <div className="flex-1">
                      <h4 className="font-semibold">{alert.title}</h4>
                      <AlertDescription className="mt-1">
                        {alert.description}
                      </AlertDescription>
                      {(alert.property || alert.department) && (
                        <div className="flex items-center space-x-2 mt-2">
                          {alert.property && (
                            <Badge variant="outline" className="text-xs">
                              {alert.property}
                            </Badge>
                          )}
                          {alert.department && (
                            <Badge variant="outline" className="text-xs">
                              {alert.department}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {alert.actions && (
                    <div className="flex space-x-2 ml-4">
                      {alert.actions.map((action, idx) => (
                        <Button key={idx} size="sm" variant="outline">
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Query Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Ask AI Copilot</CardTitle>
          <CardDescription>
            Ask questions in natural language about schedules, payroll, compliance, and more
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              placeholder="Show me who is approaching OT cap this month..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={queryMutation.isPending}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={queryMutation.isPending || !query.trim()}
              className="flex items-center space-x-1"
            >
              <Send className="w-4 h-4" />
              <span>Ask</span>
            </Button>
          </form>

          {/* Quick Query Examples */}
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Show me who is approaching OT cap this month",
                "Why did net pay change for housekeeping team?",
                "Suggest schedule fixes for next week",
                "Who has the most overtime in December?",
                "Show compliance status for ERGANI filings"
              ].map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(example)}
                  disabled={queryMutation.isPending}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query History */}
      {queryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Queries</CardTitle>
            <CardDescription>Your AI conversation history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {queryHistory.map((item, index) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      Query {queryHistory.length - index}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.timestamp.toLocaleString()}
                    </span>
                    <Badge 
                      variant={item.confidence > 0.8 ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {Math.round(item.confidence * 100)}% confident
                    </Badge>
                  </div>
                  {item.actionable && (
                    <Badge variant="outline" className="text-green-600 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Actionable
                    </Badge>
                  )}
                </div>
                
                <div className="pl-4 border-l-2 border-gray-200">
                  <p className="font-medium text-blue-900">Q: {item.query}</p>
                  <p className="mt-1 text-gray-700">A: {item.response}</p>
                  
                  {item.citations.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.citations.map((citation, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {citation}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {index < queryHistory.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {queryMutation.isPending && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-blue-600 animate-pulse" />
              <span>AI is analyzing your query...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}