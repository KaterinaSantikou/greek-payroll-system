import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Zap, 
  Target, 
  Sparkles, 
  Smartphone, 
  Shield, 
  Clock, 
  Eye, 
  Palette, 
  Navigation,
  CheckCircle,
  ArrowRight,
  Users,
  Gauge,
  Heart
} from "lucide-react";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium';
  timeline: '2025 Q1' | '2025 Q2' | '2025 Q3' | '2025 Q4' | '2026 Q1' | '2026 Q2';
  status: 'planning' | 'in-progress' | 'completed';
  category: 'speed' | 'guidance' | 'design' | 'mobile' | 'compliance';
  impact: string;
}

const guidingPrinciples = [
  {
    icon: <Zap className="w-6 h-6 text-yellow-500" />,
    title: "90-second payroll run",
    description: "No clutter, no hidden steps",
    details: "Streamlined workflow that completes full payroll processing in under 90 seconds with zero cognitive overhead"
  },
  {
    icon: <Target className="w-6 h-6 text-blue-500" />,
    title: "Contextual guidance",
    description: "Users never wonder 'what do I click next?'",
    details: "Intelligent UI that anticipates user needs and provides clear next steps at every interaction point"
  },
  {
    icon: <Sparkles className="w-6 h-6 text-purple-500" />,
    title: "Beautiful by default",
    description: "Modern typography, whitespace, iconography",
    details: "Aesthetic excellence that matches global design standards while maintaining functional clarity"
  },
  {
    icon: <Gauge className="w-6 h-6 text-green-500" />,
    title: "Speed",
    description: "Snappy transitions, instant search, mobile parity",
    details: "Sub-100ms interactions with seamless cross-platform performance optimization"
  },
  {
    icon: <Shield className="w-6 h-6 text-red-500" />,
    title: "Trust through transparency",
    description: "Compliance warnings are clear, visual, not buried",
    details: "Critical compliance information surfaced prominently with actionable guidance and visual hierarchy"
  }
];

const roadmapItems: RoadmapItem[] = [
  // 2025 Q1 - Critical Speed & Foundation
  {
    id: 'speed-core',
    title: 'Lightning Payroll Engine',
    description: 'Sub-90-second full payroll processing with real-time feedback',
    priority: 'critical',
    timeline: '2025 Q1',
    status: 'in-progress',
    category: 'speed',
    impact: 'Reduces payroll processing time from 30+ minutes to under 90 seconds'
  },
  {
    id: 'guidance-contextual',
    title: 'Smart Navigation System',
    description: 'AI-powered contextual guidance with progressive disclosure',
    priority: 'critical',
    timeline: '2025 Q1',
    status: 'planning',
    category: 'guidance',
    impact: 'Eliminates user confusion and reduces training time by 75%'
  },
  {
    id: 'design-foundation',
    title: 'Design System 2.0',
    description: 'Comprehensive design language with Greek compliance aesthetics',
    priority: 'high',
    timeline: '2025 Q1',
    status: 'planning',
    category: 'design',
    impact: 'Establishes visual consistency and premium feel across platform'
  },

  // 2025 Q2 - Mobile & Interaction Excellence
  {
    id: 'mobile-parity',
    title: 'Mobile-First Architecture',
    description: 'Native-quality mobile experience with offline capabilities',
    priority: 'high',
    timeline: '2025 Q2',
    status: 'planning',
    category: 'mobile',
    impact: 'Enables on-the-go payroll management for hotel managers'
  },
  {
    id: 'speed-search',
    title: 'Instant Everything Search',
    description: 'Sub-50ms search across employees, policies, and compliance',
    priority: 'high',
    timeline: '2025 Q2',
    status: 'planning',
    category: 'speed',
    impact: 'Reduces information discovery time from minutes to seconds'
  },
  {
    id: 'compliance-visual',
    title: 'Visual Compliance Dashboard',
    description: 'Real-time compliance status with clear visual indicators',
    priority: 'critical',
    timeline: '2025 Q2',
    status: 'planning',
    category: 'compliance',
    impact: 'Prevents compliance violations through proactive visual alerts'
  },

  // 2025 Q3 - Advanced UX & Automation
  {
    id: 'guidance-smart-flows',
    title: 'Intelligent Workflow Engine',
    description: 'Adaptive UI that learns user patterns and optimizes flows',
    priority: 'medium',
    timeline: '2025 Q3',
    status: 'planning',
    category: 'guidance',
    impact: 'Personalizes experience and reduces clicks by 40%'
  },
  {
    id: 'design-animations',
    title: 'Micro-Interaction Library',
    description: 'Delightful animations and transitions for premium feel',
    priority: 'medium',
    timeline: '2025 Q3',
    status: 'planning',
    category: 'design',
    impact: 'Enhances perceived performance and user satisfaction'
  },
  {
    id: 'speed-caching',
    title: 'Intelligent Caching System',
    description: 'Predictive data loading and smart background sync',
    priority: 'high',
    timeline: '2025 Q3',
    status: 'planning',
    category: 'speed',
    impact: 'Achieves instant page loads and zero-latency interactions'
  },

  // 2025 Q4 - AI & Predictive UX
  {
    id: 'guidance-ai-assistant',
    title: 'AI Payroll Assistant',
    description: 'Natural language interface for complex payroll operations',
    priority: 'medium',
    timeline: '2025 Q4',
    status: 'planning',
    category: 'guidance',
    impact: 'Enables natural conversation-based payroll management'
  },
  {
    id: 'compliance-predictive',
    title: 'Predictive Compliance Engine',
    description: 'AI-powered early warning system for compliance risks',
    priority: 'high',
    timeline: '2025 Q4',
    status: 'planning',
    category: 'compliance',
    impact: 'Prevents compliance issues before they occur'
  },

  // 2026 Q1-Q2 - Next-Gen Experience
  {
    id: 'design-accessibility',
    title: 'Universal Accessibility',
    description: 'WCAG 2.2 AA compliance with inclusive design patterns',
    priority: 'high',
    timeline: '2026 Q1',
    status: 'planning',
    category: 'design',
    impact: 'Ensures platform accessibility for all users'
  },
  {
    id: 'mobile-ar',
    title: 'AR Time Tracking',
    description: 'Augmented reality features for hotel shift management',
    priority: 'medium',
    timeline: '2026 Q2',
    status: 'planning',
    category: 'mobile',
    impact: 'Revolutionary shift management experience for hospitality'
  }
];

export default function UXArchitecture() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTimeline, setSelectedTimeline] = useState<string>('all');

  const categories = [
    { key: 'all', name: 'All Categories', icon: <Eye className="w-4 h-4" /> },
    { key: 'speed', name: 'Speed', icon: <Zap className="w-4 h-4" /> },
    { key: 'guidance', name: 'Guidance', icon: <Target className="w-4 h-4" /> },
    { key: 'design', name: 'Design', icon: <Palette className="w-4 h-4" /> },
    { key: 'mobile', name: 'Mobile', icon: <Smartphone className="w-4 h-4" /> },
    { key: 'compliance', name: 'Compliance', icon: <Shield className="w-4 h-4" /> }
  ];

  const timelines = [
    { key: 'all', name: 'All Timelines' },
    { key: '2025 Q1', name: '2025 Q1' },
    { key: '2025 Q2', name: '2025 Q2' },
    { key: '2025 Q3', name: '2025 Q3' },
    { key: '2025 Q4', name: '2025 Q4' },
    { key: '2026 Q1', name: '2026 Q1' },
    { key: '2026 Q2', name: '2026 Q2' }
  ];

  const filteredItems = roadmapItems.filter(item => 
    (selectedCategory === 'all' || item.category === selectedCategory) &&
    (selectedTimeline === 'all' || item.timeline === selectedTimeline)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'speed': return <Zap className="w-4 h-4" />;
      case 'guidance': return <Target className="w-4 h-4" />;
      case 'design': return <Palette className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'compliance': return <Shield className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const completedItems = roadmapItems.filter(item => item.status === 'completed').length;
  const progressPercentage = (completedItems / roadmapItems.length) * 100;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <Navigation className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-4xl font-bold">Payroll System UI/UX Roadmap</h1>
          <p className="text-xl text-muted-foreground">2025–2026 Strategic Design Evolution</p>
        </div>
      </div>

      {/* Guiding Principles */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Heart className="w-6 h-6 text-red-500" />
            Guiding Principles
          </CardTitle>
          <CardDescription className="text-lg">
            Core philosophy driving every design decision
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guidingPrinciples.map((principle, index) => (
              <div key={index} className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {principle.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{principle.title}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{principle.description}</p>
                    <p className="text-xs text-muted-foreground">{principle.details}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Roadmap Progress</span>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {completedItems}/{roadmapItems.length} Complete
            </Badge>
          </CardTitle>
          <CardDescription>
            Overall progress toward next-generation payroll UX
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="w-full h-3" />
          <p className="text-sm text-muted-foreground mt-3">
            {progressPercentage.toFixed(1)}% of roadmap items completed
          </p>
        </CardContent>
      </Card>

      {/* Roadmap Tabs */}
      <Tabs defaultValue="roadmap" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roadmap">Interactive Roadmap</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="metrics">Success Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Roadmap</CardTitle>
              <CardDescription>Focus on specific categories and timelines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Button
                        key={category.key}
                        variant={selectedCategory === category.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.key)}
                        className="flex items-center gap-1"
                      >
                        {category.icon}
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Timeline</label>
                  <div className="flex flex-wrap gap-2">
                    {timelines.map((timeline) => (
                      <Button
                        key={timeline.key}
                        variant={selectedTimeline === timeline.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTimeline(timeline.key)}
                      >
                        {timeline.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roadmap Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {getCategoryIcon(item.category)}
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription className="mt-1">{item.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      <Badge className={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Timeline</span>
                      <Badge variant="outline">{item.timeline}</Badge>
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Impact</span>
                      <p className="text-sm text-muted-foreground">{item.impact}</p>
                    </div>
                    {item.status === 'completed' && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Delivered</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Development Timeline</CardTitle>
              <CardDescription>Chronological view of UX evolution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {timelines.slice(1).map((timeline) => {
                  const timelineItems = roadmapItems.filter(item => item.timeline === timeline.key);
                  if (timelineItems.length === 0) return null;

                  return (
                    <div key={timeline.key} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <h3 className="text-xl font-semibold">{timeline.name}</h3>
                        <Badge variant="outline">
                          {timelineItems.length} items
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                        {timelineItems.map((item) => (
                          <div key={item.id} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {getCategoryIcon(item.category)}
                              <span className="font-medium">{item.title}</span>
                              <Badge className={getStatusColor(item.status)}>
                                {item.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Speed Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold">90s</div>
                <div className="text-sm text-muted-foreground">Target payroll completion time</div>
                <div className="text-sm">
                  <strong>Current:</strong> 8-12 minutes<br />
                  <strong>Improvement:</strong> 95% reduction
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  User Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold">75%</div>
                <div className="text-sm text-muted-foreground">Training time reduction</div>
                <div className="text-sm">
                  <strong>Target:</strong> Zero cognitive overhead<br />
                  <strong>Method:</strong> Contextual guidance
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-bold">100%</div>
                <div className="text-sm text-muted-foreground">Proactive compliance coverage</div>
                <div className="text-sm">
                  <strong>Target:</strong> Zero compliance surprises<br />
                  <strong>Method:</strong> Visual transparency
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Success Definition:</strong> When hotel managers can complete full payroll processing 
              in under 90 seconds without consulting documentation, training materials, or asking for help.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}