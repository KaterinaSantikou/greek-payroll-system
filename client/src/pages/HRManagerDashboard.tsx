import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users,
  UserPlus,
  Calendar,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Gift,
  Award,
  Briefcase,
  UserCheck,
  UserX,
  PieChart,
  BarChart3,
  Filter,
  Eye,
  RefreshCw,
  Download,
  Bell,
  Search,
  Plus,
  ChevronRight,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Heart,
  Coffee,
  Target
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface RecruitmentStage {
  stage: string;
  count: number;
  color: string;
}

interface JobOpening {
  id: string;
  title: string;
  department: string;
  type: 'full-time' | 'part-time' | 'contract' | 'intern';
  priority: 'high' | 'medium' | 'low';
  postedDate: string;
  applications: number;
  stages: RecruitmentStage[];
}

interface NewHire {
  id: string;
  name: string;
  position: string;
  department: string;
  startDate: string;
  onboardingProgress: number;
  pendingTasks: string[];
  manager: string;
  photo?: string;
}

interface UpcomingEvent {
  id: string;
  type: 'birthday' | 'anniversary' | 'review' | 'training' | 'meeting';
  employeeName: string;
  title: string;
  date: string;
  daysAway: number;
  department: string;
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  type: 'vacation' | 'sick' | 'personal' | 'parental' | 'bereavement';
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  reason?: string;
}

interface HRMetrics {
  turnoverRate: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
    byDepartment: { department: string; rate: number }[];
  };
  absenteeismRate: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
    weeklyData: { week: string; rate: number }[];
  };
  headcount: {
    total: number;
    newHires: number;
    departures: number;
    netChange: number;
  };
  satisfaction: {
    score: number;
    trend: 'up' | 'down' | 'stable';
    responseRate: number;
  };
}

interface PendingApproval {
  id: string;
  type: 'leave' | 'expense' | 'document' | 'training' | 'promotion';
  employeeName: string;
  description: string;
  amount?: number;
  submittedDate: string;
  urgency: 'high' | 'medium' | 'low';
}

interface EmployeeAlert {
  id: string;
  type: 'expiring-document' | 'missing-training' | 'performance-review' | 'probation-ending' | 'certification-due';
  employeeName: string;
  message: string;
  dueDate: string;
  severity: 'critical' | 'warning' | 'info';
}

export default function HRManagerDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - replace with actual API calls
  const jobOpenings: JobOpening[] = [
    {
      id: '1',
      title: 'Senior Software Engineer',
      department: 'Engineering',
      type: 'full-time',
      priority: 'high',
      postedDate: '2024-08-01',
      applications: 45,
      stages: [
        { stage: 'Applied', count: 45, color: 'bg-blue-500' },
        { stage: 'Screening', count: 30, color: 'bg-yellow-500' },
        { stage: 'Technical Interview', count: 12, color: 'bg-orange-500' },
        { stage: 'Final Interview', count: 5, color: 'bg-green-500' },
        { stage: 'Offer', count: 2, color: 'bg-purple-500' }
      ]
    },
    {
      id: '2',
      title: 'HR Coordinator',
      department: 'Human Resources',
      type: 'full-time',
      priority: 'medium',
      postedDate: '2024-08-10',
      applications: 28,
      stages: [
        { stage: 'Applied', count: 28, color: 'bg-blue-500' },
        { stage: 'Screening', count: 15, color: 'bg-yellow-500' },
        { stage: 'Interview', count: 8, color: 'bg-orange-500' },
        { stage: 'Reference Check', count: 3, color: 'bg-green-500' }
      ]
    },
    {
      id: '3',
      title: 'Marketing Specialist',
      department: 'Marketing',
      type: 'full-time',
      priority: 'low',
      postedDate: '2024-08-15',
      applications: 67,
      stages: [
        { stage: 'Applied', count: 67, color: 'bg-blue-500' },
        { stage: 'Initial Review', count: 25, color: 'bg-yellow-500' },
        { stage: 'Portfolio Review', count: 10, color: 'bg-orange-500' }
      ]
    }
  ];

  const newHires: NewHire[] = [
    {
      id: '1',
      name: 'Μαρία Παπαδοπούλου',
      position: 'Junior Developer',
      department: 'Engineering',
      startDate: '2024-08-19',
      onboardingProgress: 75,
      pendingTasks: ['Εγγραφή στο ασφαλιστικό ταμείο', 'Εκπαίδευση ασφάλειας'],
      manager: 'Γιάννης Κωνσταντίνου'
    },
    {
      id: '2', 
      name: 'Αλέξανδρος Γεωργίου',
      position: 'Sales Representative',
      department: 'Sales',
      startDate: '2024-08-16',
      onboardingProgress: 90,
      pendingTasks: ['Υπογραφή συμφωνητικού εμπιστευτικότητας'],
      manager: 'Ελένη Μιχαήλ'
    },
    {
      id: '3',
      name: 'Κατερίνα Δημητρίου',
      position: 'Graphic Designer',
      department: 'Marketing',
      startDate: '2024-08-22',
      onboardingProgress: 45,
      pendingTasks: ['Εγκατάσταση λογισμικού', 'Πρώτη συνάντηση με ομάδα', 'Ιατρική εξέταση'],
      manager: 'Νίκος Αντωνίου'
    }
  ];

  const upcomingEvents: UpcomingEvent[] = [
    { id: '1', type: 'birthday', employeeName: 'Σοφία Νικολάου', title: 'Γενέθλια', date: '2024-08-23', daysAway: 2, department: 'Finance' },
    { id: '2', type: 'anniversary', employeeName: 'Δημήτρης Αλεξάνδρου', title: '5 χρόνια στην εταιρεία', date: '2024-08-25', daysAway: 4, department: 'Engineering' },
    { id: '3', type: 'review', employeeName: 'Άννα Παπαγιάννη', title: 'Ετήσια αξιολόγηση', date: '2024-08-24', daysAway: 3, department: 'Sales' },
    { id: '4', type: 'training', employeeName: 'Γιάννης Μπαλάσκας', title: 'Εκπαίδευση ηγεσίας', date: '2024-08-26', daysAway: 5, department: 'Management' },
    { id: '5', type: 'birthday', employeeName: 'Μαρίνα Κωνσταντίνου', title: 'Γενέθλια', date: '2024-08-27', daysAway: 6, department: 'HR' }
  ];

  const leaveRequests: LeaveRequest[] = [
    { id: '1', employeeName: 'Γιάννης Παπαδάκης', type: 'vacation', startDate: '2024-09-02', endDate: '2024-09-06', days: 5, status: 'pending', requestDate: '2024-08-15' },
    { id: '2', employeeName: 'Ελένη Μαρκάκη', type: 'sick', startDate: '2024-08-22', endDate: '2024-08-22', days: 1, status: 'pending', requestDate: '2024-08-21' },
    { id: '3', employeeName: 'Νίκος Βασιλείου', type: 'personal', startDate: '2024-08-30', endDate: '2024-08-30', days: 1, status: 'pending', requestDate: '2024-08-18' },
    { id: '4', employeeName: 'Μαρία Θεοδώρου', type: 'parental', startDate: '2024-09-15', endDate: '2024-12-15', days: 92, status: 'pending', requestDate: '2024-08-10' }
  ];

  const hrMetrics: HRMetrics = {
    turnoverRate: {
      current: 8.5,
      previous: 12.3,
      trend: 'down',
      byDepartment: [
        { department: 'Engineering', rate: 6.2 },
        { department: 'Sales', rate: 11.8 },
        { department: 'Marketing', rate: 9.1 },
        { department: 'Finance', rate: 4.5 },
        { department: 'HR', rate: 7.3 }
      ]
    },
    absenteeismRate: {
      current: 3.2,
      previous: 4.1,
      trend: 'down',
      weeklyData: [
        { week: 'Week 1', rate: 4.2 },
        { week: 'Week 2', rate: 3.8 },
        { week: 'Week 3', rate: 3.1 },
        { week: 'Week 4', rate: 3.2 }
      ]
    },
    headcount: {
      total: 247,
      newHires: 12,
      departures: 8,
      netChange: 4
    },
    satisfaction: {
      score: 7.8,
      trend: 'up',
      responseRate: 86
    }
  };

  const pendingApprovals: PendingApproval[] = [
    { id: '1', type: 'leave', employeeName: 'Γιάννης Παπαδάκης', description: 'Αίτηση για άδεια 5 ημερών', submittedDate: '2024-08-15', urgency: 'medium' },
    { id: '2', type: 'expense', employeeName: 'Σοφία Γεωργίου', description: 'Έξοδα συνεδρίου', amount: 850, submittedDate: '2024-08-20', urgency: 'low' },
    { id: '3', type: 'training', employeeName: 'Μάριος Αντωνίου', description: 'Αίτηση για εκπαίδευση PMP', amount: 1200, submittedDate: '2024-08-18', urgency: 'high' },
    { id: '4', type: 'promotion', employeeName: 'Ελένη Δημητρίου', description: 'Προαγωγή σε Senior Developer', submittedDate: '2024-08-12', urgency: 'high' },
    { id: '5', type: 'document', employeeName: 'Νίκος Μιχαήλ', description: 'Αίτηση πιστοποιητικού εργασίας', submittedDate: '2024-08-19', urgency: 'medium' }
  ];

  const employeeAlerts: EmployeeAlert[] = [
    { id: '1', type: 'expiring-document', employeeName: 'Αλέξανδρος Κάρλος', message: 'Το διαβατήριο λήγει σε 30 ημέρες', dueDate: '2024-09-21', severity: 'warning' },
    { id: '2', type: 'missing-training', employeeName: 'Μαρίνα Αθανασίου', message: 'Υποχρεωτική εκπαίδευση ασφάλειας σε εκκρεμότητα', dueDate: '2024-08-30', severity: 'critical' },
    { id: '3', type: 'performance-review', employeeName: 'Γιώργος Παπακώστας', message: 'Ετήσια αξιολόγηση σε καθυστέρηση', dueDate: '2024-08-25', severity: 'critical' },
    { id: '4', type: 'probation-ending', employeeName: 'Κατερίνα Βασιλείου', message: 'Περίοδος δοκιμασίας τελειώνει σε 10 ημέρες', dueDate: '2024-09-01', severity: 'warning' },
    { id: '5', type: 'certification-due', employeeName: 'Πέτρος Λεωνίδας', message: 'Πιστοποίηση ISO 9001 λήγει', dueDate: '2024-09-15', severity: 'info' }
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Gift className="h-4 w-4" />;
      case 'anniversary': return <Award className="h-4 w-4" />;
      case 'review': return <FileText className="h-4 w-4" />;
      case 'training': return <GraduationCap className="h-4 w-4" />;
      case 'meeting': return <MessageSquare className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getLeaveIcon = (type: string) => {
    switch (type) {
      case 'vacation': return <Coffee className="h-4 w-4" />;
      case 'sick': return <Heart className="h-4 w-4" />;
      case 'personal': return <Users className="h-4 w-4" />;
      case 'parental': return <Users className="h-4 w-4" />;
      case 'bereavement': return <Heart className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100 border-red-200';
      case 'warning': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'info': return 'text-blue-700 bg-blue-100 border-blue-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-700 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-100 border-green-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            HR Manager Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            People operations, talent management, and employee lifecycle oversight
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <UserCheck className="h-3 w-3 mr-1" />
            {hrMetrics.headcount.total} Employees
          </Badge>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Hire
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Headcount</p>
                <p className="text-2xl font-bold">{hrMetrics.headcount.total}</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{hrMetrics.headcount.netChange} this month</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Turnover Rate</p>
                <p className="text-2xl font-bold">{hrMetrics.turnoverRate.current}%</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">-{(hrMetrics.turnoverRate.previous - hrMetrics.turnoverRate.current).toFixed(1)}% vs last month</span>
                </div>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Absenteeism Rate</p>
                <p className="text-2xl font-bold">{hrMetrics.absenteeismRate.current}%</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">-{(hrMetrics.absenteeismRate.previous - hrMetrics.absenteeismRate.current).toFixed(1)}% vs last month</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Satisfaction Score</p>
                <p className="text-2xl font-bold">{hrMetrics.satisfaction.score}/10</p>
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">{hrMetrics.satisfaction.responseRate}% response rate</span>
                </div>
              </div>
              <Heart className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recruitment Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Active Recruitment Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {jobOpenings.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{job.title}</h4>
                        <p className="text-sm text-gray-600">{job.department} • {job.applications} applicants</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={job.priority === 'high' ? 'bg-red-100 text-red-800 border-red-200' : 
                                        job.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                        'bg-green-100 text-green-800 border-green-200'}>
                          {job.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{job.type}</Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Recruitment Progress</span>
                        <span>{job.stages[job.stages.length - 1].count} in final stage</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        {job.stages.map((stage, index) => (
                          <div 
                            key={index}
                            className={`${stage.color} rounded-sm flex-1 relative`}
                            style={{ opacity: stage.count / job.applications }}
                            title={`${stage.stage}: ${stage.count} candidates`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        {job.stages.map((stage, index) => (
                          <span key={index} className="text-center flex-1">
                            {stage.count}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        {job.stages.map((stage, index) => (
                          <span key={index} className="text-center flex-1 truncate">
                            {stage.stage}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* New Hire Onboarding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                New Hire Onboarding Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {newHires.map((hire) => (
                  <div key={hire.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserPlus className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{hire.name}</h4>
                          <p className="text-sm text-gray-600">{hire.position} • {hire.department}</p>
                          <p className="text-xs text-gray-500">Starts: {new Date(hire.startDate).toLocaleDateString('el-GR')} • Manager: {hire.manager}</p>
                        </div>
                      </div>
                      <Badge className={hire.onboardingProgress >= 80 ? 'bg-green-100 text-green-800 border-green-200' :
                                      hire.onboardingProgress >= 50 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                      'bg-red-100 text-red-800 border-red-200'}>
                        {hire.onboardingProgress}% Complete
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Onboarding Progress</span>
                        <span>{hire.onboardingProgress}%</span>
                      </div>
                      <Progress value={hire.onboardingProgress} className="w-full" />
                      
                      {hire.pendingTasks.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Pending Tasks:</p>
                          <div className="space-y-1">
                            {hire.pendingTasks.map((task, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                                <div className="w-2 h-2 bg-orange-400 rounded-full" />
                                {task}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Turnover Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Turnover Rate by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hrMetrics.turnoverRate.byDepartment.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{dept.department}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((dept.rate / 15) * 100, 100)}%` }}
                        />
                      </div>
                      <Badge variant="outline" className="w-12 justify-center">
                        {dept.rate}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-2 border rounded">
                    <div className={`p-2 rounded-lg ${
                      event.type === 'birthday' ? 'bg-pink-100 text-pink-600' :
                      event.type === 'anniversary' ? 'bg-yellow-100 text-yellow-600' :
                      event.type === 'review' ? 'bg-blue-100 text-blue-600' :
                      event.type === 'training' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{event.employeeName}</p>
                      <p className="text-xs text-gray-600">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.department}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {event.daysAway}d
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leave Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Pending Leave Requests
                <Badge variant="destructive" className="ml-auto">
                  {leaveRequests.filter(r => r.status === 'pending').length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaveRequests.filter(request => request.status === 'pending').map((request) => (
                  <div key={request.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getLeaveIcon(request.type)}
                        <span className="font-medium text-sm">{request.employeeName}</span>
                      </div>
                      <Badge className="text-xs capitalize">{request.type}</Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>{new Date(request.startDate).toLocaleDateString('el-GR')} - {new Date(request.endDate).toLocaleDateString('el-GR')}</p>
                      <p>{request.days} day{request.days !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="flex-1">Approve</Button>
                      <Button size="sm" variant="outline" className="flex-1">Review</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Pending Approvals
                <Badge variant="destructive" className="ml-auto">
                  {pendingApprovals.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApprovals.slice(0, 4).map((approval) => (
                  <div key={approval.id} className="border rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{approval.employeeName}</span>
                      <Badge className={`text-xs ${getUrgencyColor(approval.urgency)}`}>
                        {approval.urgency}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{approval.description}</p>
                    {approval.amount && (
                      <p className="text-xs font-medium text-green-600">Amount: €{approval.amount}</p>
                    )}
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className="capitalize">{approval.type}</span>
                      <span>{approval.submittedDate}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-3" size="sm">
                View All Approvals
              </Button>
            </CardContent>
          </Card>

          {/* Employee Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Employee Alerts
                <Badge variant="destructive" className="ml-auto">
                  {employeeAlerts.filter(a => a.severity === 'critical').length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employeeAlerts.slice(0, 4).map((alert) => (
                  <Alert key={alert.id} className={`${getSeverityColor(alert.severity)} border`}>
                    <div className="flex items-start gap-2">
                      {alert.severity === 'critical' && <AlertTriangle className="h-4 w-4 mt-0.5" />}
                      {alert.severity === 'warning' && <Clock className="h-4 w-4 mt-0.5" />}
                      {alert.severity === 'info' && <CheckCircle className="h-4 w-4 mt-0.5" />}
                      <div className="flex-1">
                        <div className="font-medium text-sm">{alert.employeeName}</div>
                        <AlertDescription className="text-xs">
                          {alert.message}
                        </AlertDescription>
                        <div className="text-xs text-gray-500 mt-1">Due: {alert.dueDate}</div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-3" size="sm">
                View All Alerts
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}