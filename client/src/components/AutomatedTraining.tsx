/**
 * Automated Training System with Personalized Learning Paths
 * Intelligent training platform for Greek payroll mastery
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  BookOpen,
  Trophy,
  Clock,
  Users,
  Brain,
  Target,
  CheckCircle,
  PlayCircle,
  Star,
  TrendingUp,
  Award,
  Zap,
  Shield,
  Calendar,
  BarChart3,
  Lightbulb,
  ChevronRight,
  Lock,
  Unlock,
  GraduationCap,
  FileText,
  Video,
  Headphones,
  PuzzleIcon
} from 'lucide-react';

interface TrainingModule {
  id: string;
  title: string;
  titleEl: string;
  description: string;
  descriptionEl: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  type: 'video' | 'interactive' | 'reading' | 'quiz' | 'practical';
  category: string;
  categoryEl: string;
  prerequisites: string[];
  completed: boolean;
  locked: boolean;
  progress: number;
  rating: number;
  enrolledCount: number;
}

interface LearningPath {
  id: string;
  title: string;
  titleEl: string;
  description: string;
  descriptionEl: string;
  role: string;
  roleEl: string;
  modules: string[];
  estimatedHours: number;
  completionRate: number;
  color: string;
  icon: React.ElementType;
}

interface UserProgress {
  totalModulesCompleted: number;
  totalHoursSpent: number;
  streakDays: number;
  certifications: string[];
  currentLevel: string;
  xpPoints: number;
  achievements: string[];
}

interface AutomatedTrainingProps {
  locale?: 'en' | 'el';
  userRole?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

const TRAINING_MODULES: TrainingModule[] = [
  // Greek Payroll Fundamentals
  {
    id: 'greek-payroll-intro',
    title: 'Introduction to Greek Payroll',
    titleEl: 'Εισαγωγή στην Ελληνική Μισθοδοσία',
    description: 'Comprehensive overview of Greek payroll system, laws, and regulations',
    descriptionEl: 'Πλήρης επισκόπηση του ελληνικού συστήματος μισθοδοσίας, νόμων και κανονισμών',
    difficulty: 'beginner',
    duration: 45,
    type: 'video',
    category: 'Fundamentals',
    categoryEl: 'Βασικά',
    prerequisites: [],
    completed: false,
    locked: false,
    progress: 0,
    rating: 4.8,
    enrolledCount: 1247
  },
  {
    id: 'ergani-ii-training',
    title: 'ERGANI II Digital Work Cards',
    titleEl: 'Ψηφιακές Κάρτες Εργασίας ΕΡΓΑΝΗ ΙΙ',
    description: 'Complete guide to ERGANI II system, digital work cards, and compliance',
    descriptionEl: 'Πλήρης οδηγός για το σύστημα ΕΡΓΑΝΗ ΙΙ, ψηφιακές κάρτες εργασίας και συμμόρφωση',
    difficulty: 'intermediate',
    duration: 60,
    type: 'interactive',
    category: 'Compliance',
    categoryEl: 'Συμμόρφωση',
    prerequisites: ['greek-payroll-intro'],
    completed: false,
    locked: true,
    progress: 0,
    rating: 4.9,
    enrolledCount: 892
  },
  {
    id: 'efka-insurance',
    title: 'e-EFKA Social Security Integration',
    titleEl: 'Ενσωμάτωση Κοινωνικής Ασφάλισης e-ΕΦΚΑ',
    description: 'Master e-EFKA insurance calculations, reporting, and compliance requirements',
    descriptionEl: 'Κυριαρχήστε στους υπολογισμούς ασφάλισης e-ΕΦΚΑ, αναφορές και απαιτήσεις συμμόρφωσης',
    difficulty: 'intermediate',
    duration: 75,
    type: 'practical',
    category: 'Compliance',
    categoryEl: 'Συμμόρφωση',
    prerequisites: ['greek-payroll-intro'],
    completed: false,
    locked: true,
    progress: 0,
    rating: 4.7,
    enrolledCount: 756
  },
  {
    id: 'aade-tax-integration',
    title: 'AADE Tax Authority Integration',
    titleEl: 'Ενσωμάτωση Φορολογικής Αρχής ΑΑΔΕ',
    description: 'Learn AADE integration, tax calculations, and automated filing processes',
    descriptionEl: 'Μάθετε την ενσωμάτωση ΑΑΔΕ, φορολογικούς υπολογισμούς και αυτοματοποιημένες διαδικασίες υποβολής',
    difficulty: 'advanced',
    duration: 90,
    type: 'interactive',
    category: 'Compliance',
    categoryEl: 'Συμμόρφωση',
    prerequisites: ['greek-payroll-intro', 'ergani-ii-training'],
    completed: false,
    locked: true,
    progress: 0,
    rating: 4.6,
    enrolledCount: 634
  },
  {
    id: 'sepa-banking-training',
    title: 'SEPA Banking and Salary Payments',
    titleEl: 'Τραπεζικές Υπηρεσίες SEPA και Πληρωμές Μισθών',
    description: 'Configure SEPA payments, Greek bank integration, and automated salary transfers',
    descriptionEl: 'Ρύθμιση πληρωμών SEPA, ενσωμάτωση ελληνικής τράπεζας και αυτοματοποιημένες μεταφορές μισθών',
    difficulty: 'intermediate',
    duration: 50,
    type: 'practical',
    category: 'Banking',
    categoryEl: 'Τραπεζικά',
    prerequisites: ['greek-payroll-intro'],
    completed: false,
    locked: true,
    progress: 0,
    rating: 4.8,
    enrolledCount: 923
  },
  {
    id: 'collective-agreements',
    title: 'Greek Collective Agreements',
    titleEl: 'Ελληνικές Συλλογικές Συμβάσεις',
    description: 'Understanding and implementing Greek collective labor agreements in payroll',
    descriptionEl: 'Κατανόηση και εφαρμογή ελληνικών συλλογικών εργατικών συμβάσεων στη μισθοδοσία',
    difficulty: 'advanced',
    duration: 120,
    type: 'reading',
    category: 'Legal',
    categoryEl: 'Νομικά',
    prerequisites: ['greek-payroll-intro', 'ergani-ii-training'],
    completed: false,
    locked: true,
    progress: 0,
    rating: 4.5,
    enrolledCount: 567
  },
  {
    id: 'payroll-calculations',
    title: 'Greek Payroll Calculations',
    titleEl: 'Υπολογισμοί Ελληνικής Μισθοδοσίας',
    description: 'Master complex Greek payroll calculations including overtime, bonuses, and deductions',
    descriptionEl: 'Κυριαρχήστε στους περίπλοκους υπολογισμούς ελληνικής μισθοδοσίας συμπεριλαμβανομένων υπερωριών, μπόνους και κρατήσεων',
    difficulty: 'advanced',
    duration: 100,
    type: 'interactive',
    category: 'Calculations',
    categoryEl: 'Υπολογισμοί',
    prerequisites: ['greek-payroll-intro', 'efka-insurance'],
    completed: false,
    locked: true,
    progress: 0,
    rating: 4.9,
    enrolledCount: 1123
  },
  {
    id: 'hotel-industry-specifics',
    title: 'Hotel Industry Payroll Specialization',
    titleEl: 'Εξειδίκευση Μισθοδοσίας Ξενοδοχειακής Βιομηχανίας',
    description: 'Specialized training for hotel industry payroll including tips, seasonal work, and split shifts',
    descriptionEl: 'Εξειδικευμένη εκπαίδευση για μισθοδοσία ξενοδοχειακής βιομηχανίας συμπεριλαμβανομένων φιλοδωρημάτων, εποχιακής εργασίας και διαχωρισμένων βαρδιών',
    difficulty: 'advanced',
    duration: 85,
    type: 'practical',
    category: 'Industry-Specific',
    categoryEl: 'Κλαδικά',
    prerequisites: ['payroll-calculations', 'collective-agreements'],
    completed: false,
    locked: true,
    progress: 0,
    rating: 4.7,
    enrolledCount: 445
  }
];

const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'hr-professional',
    title: 'HR Professional Path',
    titleEl: 'Διαδρομή Επαγγελματία HR',
    description: 'Complete learning path for HR professionals managing Greek payroll',
    descriptionEl: 'Πλήρης μαθησιακή διαδρομή για επαγγελματίες HR που διαχειρίζονται ελληνική μισθοδοσία',
    role: 'HR Professional',
    roleEl: 'Επαγγελματίας HR',
    modules: ['greek-payroll-intro', 'ergani-ii-training', 'efka-insurance', 'aade-tax-integration'],
    estimatedHours: 4.5,
    completionRate: 0,
    color: 'bg-blue-500',
    icon: Users
  },
  {
    id: 'payroll-specialist',
    title: 'Payroll Specialist Path',
    titleEl: 'Διαδρομή Ειδικού Μισθοδοσίας',
    description: 'Advanced path for payroll specialists and accountants',
    descriptionEl: 'Προχωρημένη διαδρομή για ειδικούς μισθοδοσίας και λογιστές',
    role: 'Payroll Specialist',
    roleEl: 'Ειδικός Μισθοδοσίας',
    modules: ['greek-payroll-intro', 'payroll-calculations', 'efka-insurance', 'aade-tax-integration', 'sepa-banking-training', 'collective-agreements'],
    estimatedHours: 7.5,
    completionRate: 0,
    color: 'bg-green-500',
    icon: Target
  },
  {
    id: 'manager-basics',
    title: 'Manager Essentials',
    titleEl: 'Βασικά για Μάνατζερ',
    description: 'Essential Greek payroll knowledge for managers and supervisors',
    descriptionEl: 'Βασικές γνώσεις ελληνικής μισθοδοσίας για μάνατζερ και επιβλέποντες',
    role: 'Manager',
    roleEl: 'Μάνατζερ',
    modules: ['greek-payroll-intro', 'ergani-ii-training', 'collective-agreements'],
    estimatedHours: 3.5,
    completionRate: 0,
    color: 'bg-purple-500',
    icon: Target
  },
  {
    id: 'hotel-specialist',
    title: 'Hotel Industry Specialist',
    titleEl: 'Ειδικός Ξενοδοχειακής Βιομηχανίας',
    description: 'Specialized path for hotel and hospitality industry payroll',
    descriptionEl: 'Εξειδικευμένη διαδρομή για μισθοδοσία ξενοδοχειακής και φιλοξενίας βιομηχανίας',
    role: 'Hotel Specialist',
    roleEl: 'Ειδικός Ξενοδοχείων',
    modules: ['greek-payroll-intro', 'payroll-calculations', 'hotel-industry-specifics', 'ergani-ii-training', 'collective-agreements'],
    estimatedHours: 6.0,
    completionRate: 0,
    color: 'bg-orange-500',
    icon: Award
  }
];

export default function AutomatedTraining({
  locale = 'en',
  userRole = 'HR Professional',
  experienceLevel = 'beginner'
}: AutomatedTrainingProps) {
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [modules, setModules] = useState(TRAINING_MODULES);
  const [learningPaths] = useState(LEARNING_PATHS);
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [userProgress] = useState<UserProgress>({
    totalModulesCompleted: 2,
    totalHoursSpent: 12,
    streakDays: 7,
    certifications: ['Greek Payroll Fundamentals'],
    currentLevel: 'Apprentice',
    xpPoints: 1250,
    achievements: ['First Module', 'Week Streak', 'Quick Learner']
  });

  const translations = {
    en: {
      title: 'Automated Training System',
      subtitle: 'Personalized Learning Paths for Greek Payroll Mastery',
      dashboard: 'Dashboard',
      learningPaths: 'Learning Paths',
      allModules: 'All Modules',
      achievements: 'Achievements',
      analytics: 'Analytics',
      welcome: 'Welcome back',
      continueTraining: 'Continue Training',
      startLearning: 'Start Learning',
      viewAll: 'View All',
      progress: 'Your Progress',
      stats: {
        completed: 'Modules Completed',
        hours: 'Hours Spent',
        streak: 'Day Streak',
        level: 'Current Level'
      },
      recommended: 'Recommended for You',
      recentlyStarted: 'Recently Started',
      difficulty: {
        beginner: 'Beginner',
        intermediate: 'Intermediate',
        advanced: 'Advanced'
      },
      moduleTypes: {
        video: 'Video',
        interactive: 'Interactive',
        reading: 'Reading',
        quiz: 'Quiz',
        practical: 'Practical'
      },
      duration: 'minutes',
      enrolled: 'enrolled',
      locked: 'Locked',
      unlocked: 'Unlocked',
      complete: 'Complete',
      start: 'Start',
      resume: 'Resume',
      estimatedTime: 'Estimated time',
      prerequisites: 'Prerequisites',
      completionRate: 'Completion rate',
      learningObjectives: 'Learning Objectives',
      skillsGained: 'Skills You\'ll Gain'
    },
    el: {
      title: 'Σύστημα Αυτοματοποιημένης Εκπαίδευσης',
      subtitle: 'Εξατομικευμένες Μαθησιακές Διαδρομές για Κυριαρχία στην Ελληνική Μισθοδοσία',
      dashboard: 'Ταμπλό',
      learningPaths: 'Μαθησιακές Διαδρομές',
      allModules: 'Όλα τα Μαθήματα',
      achievements: 'Επιτεύγματα',
      analytics: 'Αναλυτικά',
      welcome: 'Καλώς ήρθατε πίσω',
      continueTraining: 'Συνέχεια Εκπαίδευσης',
      startLearning: 'Έναρξη Μάθησης',
      viewAll: 'Προβολή Όλων',
      progress: 'Η Πρόοδός σας',
      stats: {
        completed: 'Ολοκληρωμένα Μαθήματα',
        hours: 'Ώρες Σπουδών',
        streak: 'Συνεχόμενες Ημέρες',
        level: 'Τρέχον Επίπεδο'
      },
      recommended: 'Προτεινόμενα για Εσάς',
      recentlyStarted: 'Πρόσφατα Ξεκινημένα',
      difficulty: {
        beginner: 'Αρχάριο',
        intermediate: 'Μεσαίο',
        advanced: 'Προχωρημένο'
      },
      moduleTypes: {
        video: 'Βίντεο',
        interactive: 'Διαδραστικό',
        reading: 'Ανάγνωση',
        quiz: 'Κουίζ',
        practical: 'Πρακτικό'
      },
      duration: 'λεπτά',
      enrolled: 'εγγεγραμμένοι',
      locked: 'Κλειδωμένο',
      unlocked: 'Ξεκλειδωμένο',
      complete: 'Ολοκλήρωση',
      start: 'Έναρξη',
      resume: 'Συνέχεια',
      estimatedTime: 'Εκτιμώμενος χρόνος',
      prerequisites: 'Προαπαιτούμενα',
      completionRate: 'Ποσοστό ολοκλήρωσης',
      learningObjectives: 'Μαθησιακοί Στόχοι',
      skillsGained: 'Δεξιότητες που θα Αποκτήσετε'
    }
  };

  const t = translations[locale];

  // Calculate completion rates based on completed modules
  useEffect(() => {
    const completedIds = modules.filter(m => m.completed).map(m => m.id);
    
    // Unlock modules based on prerequisites
    const updatedModules = modules.map(module => {
      const prerequisitesMet = module.prerequisites.every(prereq => 
        completedIds.includes(prereq)
      );
      return {
        ...module,
        locked: module.prerequisites.length > 0 && !prerequisitesMet && !module.completed
      };
    });
    
    if (JSON.stringify(updatedModules) !== JSON.stringify(modules)) {
      setModules(updatedModules);
    }
  }, [modules]);

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'interactive': return PuzzleIcon;
      case 'reading': return FileText;
      case 'quiz': return Brain;
      case 'practical': return Target;
      default: return BookOpen;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecommendedModules = () => {
    return modules
      .filter(m => !m.locked && !m.completed)
      .sort((a, b) => {
        // Prioritize based on user experience level and role
        if (experienceLevel === 'beginner' && a.difficulty === 'beginner') return -1;
        if (experienceLevel === 'advanced' && a.difficulty === 'advanced') return -1;
        return b.rating - a.rating;
      })
      .slice(0, 3);
  };

  const handleStartModule = (moduleId: string) => {
    setCurrentModule(moduleId);
    // In real implementation, this would navigate to the module content
    console.log(`Starting module: ${moduleId}`);
  };

  const handleCompleteModule = (moduleId: string) => {
    setModules(prev => 
      prev.map(module => 
        module.id === moduleId 
          ? { ...module, completed: true, progress: 100 }
          : module
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
              <p className="text-gray-600">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{userProgress.xpPoints} XP</div>
                <div className="text-sm text-gray-600">{userProgress.currentLevel}</div>
              </div>
              <Avatar className="h-12 w-12">
                <AvatarImage src="/api/placeholder/48/48" />
                <AvatarFallback className="bg-blue-600 text-white">
                  <GraduationCap className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-6 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{userProgress.totalModulesCompleted}</div>
                  <div className="text-sm text-gray-600">{t.stats.completed}</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{userProgress.totalHoursSpent}</div>
                  <div className="text-sm text-gray-600">{t.stats.hours}</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{userProgress.streakDays}</div>
                  <div className="text-sm text-gray-600">{t.stats.streak}</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Trophy className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{userProgress.currentLevel}</div>
                  <div className="text-sm text-gray-600">{t.stats.level}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">{t.dashboard}</TabsTrigger>
            <TabsTrigger value="paths">{t.learningPaths}</TabsTrigger>
            <TabsTrigger value="modules">{t.allModules}</TabsTrigger>
            <TabsTrigger value="achievements">{t.achievements}</TabsTrigger>
            <TabsTrigger value="analytics">{t.analytics}</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Continue Learning */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PlayCircle className="h-5 w-5 text-blue-600" />
                      {t.continueTraining}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">ERGANI II Digital Work Cards</h3>
                          <p className="text-blue-100">Interactive Training • 60 minutes</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">65%</div>
                          <div className="text-blue-100">Complete</div>
                        </div>
                      </div>
                      <Progress value={65} className="mb-4 bg-white/20" />
                      <Button className="bg-white text-blue-600 hover:bg-gray-100">
                        {t.resume}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommended Modules */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600" />
                        {t.recommended}
                      </CardTitle>
                      <Button variant="ghost" size="sm">
                        {t.viewAll} <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {getRecommendedModules().map((module) => {
                        const IconComponent = getModuleIcon(module.type);
                        return (
                          <div key={module.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <IconComponent className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium">{locale === 'en' ? module.title : module.titleEl}</h3>
                              <p className="text-sm text-gray-600">{locale === 'en' ? module.description : module.descriptionEl}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={getDifficultyColor(module.difficulty)}>
                                  {t.difficulty[module.difficulty as keyof typeof t.difficulty]}
                                </Badge>
                                <span className="text-xs text-gray-500">{module.duration} {t.duration}</span>
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  <span className="text-xs">{module.rating}</span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => handleStartModule(module.id)}
                              disabled={module.locked}
                            >
                              {module.locked ? (
                                <>
                                  <Lock className="h-4 w-4 mr-1" />
                                  {t.locked}
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  {t.start}
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Progress Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      {t.progress}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Overall Progress</span>
                          <span>25%</span>
                        </div>
                        <Progress value={25} />
                      </div>
                      
                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-3">Recent Achievements</h4>
                        <div className="space-y-2">
                          {userProgress.achievements.map((achievement, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm">{achievement}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-3">Next Milestone</h4>
                        <div className="text-sm text-gray-600">
                          Complete 3 more modules to reach <strong>Journeyman</strong> level
                        </div>
                        <Progress value={60} className="mt-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Study Session
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Join Study Group
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Download Resources
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Learning Paths Tab */}
          <TabsContent value="paths" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {learningPaths.map((path) => {
                const IconComponent = path.icon;
                const pathModules = modules.filter(m => path.modules.includes(m.id));
                const completedModules = pathModules.filter(m => m.completed).length;
                const completionRate = (completedModules / pathModules.length) * 100;

                return (
                  <Card key={path.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 ${path.color} rounded-lg text-white`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle>{locale === 'en' ? path.title : path.titleEl}</CardTitle>
                          <p className="text-sm text-gray-600">{locale === 'en' ? path.role : path.roleEl}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">{locale === 'en' ? path.description : path.descriptionEl}</p>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                          <span>{t.estimatedTime}: {path.estimatedHours}h</span>
                          <span>{completedModules}/{pathModules.length} modules</span>
                        </div>
                        <Progress value={completionRate} />
                      </div>

                      <div className="space-y-2 mb-4">
                        {pathModules.slice(0, 3).map((module) => (
                          <div key={module.id} className="flex items-center gap-2 text-sm">
                            {module.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : module.locked ? (
                              <Lock className="h-4 w-4 text-gray-400" />
                            ) : (
                              <PlayCircle className="h-4 w-4 text-blue-600" />
                            )}
                            <span className={module.completed ? 'text-green-600' : module.locked ? 'text-gray-400' : 'text-gray-700'}>
                              {locale === 'en' ? module.title : module.titleEl}
                            </span>
                          </div>
                        ))}
                        {pathModules.length > 3 && (
                          <div className="text-sm text-gray-500">
                            +{pathModules.length - 3} more modules
                          </div>
                        )}
                      </div>

                      <Button className="w-full">
                        {completionRate > 0 ? t.resume : t.startLearning}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* All Modules Tab */}
          <TabsContent value="modules" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => {
                const IconComponent = getModuleIcon(module.type);
                
                return (
                  <Card key={module.id} className={`hover:shadow-lg transition-shadow ${module.locked ? 'opacity-60' : ''}`}>
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{locale === 'en' ? module.title : module.titleEl}</CardTitle>
                          <p className="text-sm text-gray-600">{locale === 'en' ? module.category : module.categoryEl}</p>
                        </div>
                        {module.completed && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {locale === 'en' ? module.description : module.descriptionEl}
                      </p>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                          <Badge className={getDifficultyColor(module.difficulty)}>
                            {t.difficulty[module.difficulty as keyof typeof t.difficulty]}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            {module.rating} • {module.enrolledCount} {t.enrolled}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {module.duration} {t.duration}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {t.moduleTypes[module.type as keyof typeof t.moduleTypes]}
                          </div>
                        </div>

                        {module.progress > 0 && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{module.progress}%</span>
                            </div>
                            <Progress value={module.progress} />
                          </div>
                        )}

                        {module.prerequisites.length > 0 && (
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">{t.prerequisites}:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {module.prerequisites.map((prereq) => {
                                const prereqModule = modules.find(m => m.id === prereq);
                                return (
                                  <Badge key={prereq} variant="outline" className="text-xs">
                                    {prereqModule ? (locale === 'en' ? prereqModule.title : prereqModule.titleEl) : prereq}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full"
                        onClick={() => handleStartModule(module.id)}
                        disabled={module.locked}
                        variant={module.completed ? "outline" : "default"}
                      >
                        {module.locked ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            {t.locked}
                          </>
                        ) : module.completed ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {t.complete}
                          </>
                        ) : module.progress > 0 ? (
                          <>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {t.resume}
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {t.start}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Achievement Cards */}
              <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200">
                <CardContent className="p-6 text-center">
                  <Trophy className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">First Module Completed</h3>
                  <p className="text-gray-600">You've completed your first training module!</p>
                  <Badge className="mt-3 bg-yellow-600 text-white">Unlocked</Badge>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-100 to-blue-200">
                <CardContent className="p-6 text-center">
                  <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Week Streak</h3>
                  <p className="text-gray-600">7 consecutive days of learning!</p>
                  <Badge className="mt-3 bg-blue-600 text-white">Unlocked</Badge>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-100 to-green-200">
                <CardContent className="p-6 text-center">
                  <Brain className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2">Quick Learner</h3>
                  <p className="text-gray-600">Completed a module in under 30 minutes</p>
                  <Badge className="mt-3 bg-green-600 text-white">Unlocked</Badge>
                </CardContent>
              </Card>

              <Card className="bg-gray-100 opacity-75">
                <CardContent className="p-6 text-center">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2 text-gray-600">Greek Expert</h3>
                  <p className="text-gray-500">Complete all Greek compliance modules</p>
                  <Badge variant="outline" className="mt-3">Locked</Badge>
                </CardContent>
              </Card>

              <Card className="bg-gray-100 opacity-75">
                <CardContent className="p-6 text-center">
                  <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2 text-gray-600">Perfect Score</h3>
                  <p className="text-gray-500">Achieve 100% on any quiz</p>
                  <Badge variant="outline" className="mt-3">Locked</Badge>
                </CardContent>
              </Card>

              <Card className="bg-gray-100 opacity-75">
                <CardContent className="p-6 text-center">
                  <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="font-bold text-lg mb-2 text-gray-600">Certified Professional</h3>
                  <p className="text-gray-500">Earn your first certification</p>
                  <Badge variant="outline" className="mt-3">Locked</Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Learning Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Progress chart would be rendered here
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Study Time Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>This Week</span>
                      <span className="font-bold">8 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>This Month</span>
                      <span className="font-bold">24 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Session</span>
                      <span className="font-bold">45 minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Longest Streak</span>
                      <span className="font-bold">12 days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Knowledge Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Greek Compliance</span>
                        <span>75%</span>
                      </div>
                      <Progress value={75} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Payroll Calculations</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Banking Integration</span>
                        <span>30%</span>
                      </div>
                      <Progress value={30} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Legal Requirements</span>
                        <span>60%</span>
                      </div>
                      <Progress value={60} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Strong Performance</span>
                      </div>
                      <p className="text-green-700 text-sm">You're excelling in Greek compliance modules. Keep it up!</p>
                    </div>
                    
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800">Focus Area</span>
                      </div>
                      <p className="text-yellow-700 text-sm">Consider spending more time on payroll calculations for better understanding.</p>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Recommendation</span>
                      </div>
                      <p className="text-blue-700 text-sm">Try the interactive modules - they match your learning style perfectly!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}