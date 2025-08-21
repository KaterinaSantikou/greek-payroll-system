import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calculator, FileText, Shield, ArrowRight, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useAppContext } from "@/contexts/AppContext";

export default function Home() {
  const { user } = useAuth();
  const { viewingMode, setViewingMode } = useAppContext();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Welcome, {user?.firstName || 'User'}!
          </h1>
          <p className="text-neutral-600 dark:text-neutral-300">
            Your comprehensive payroll management dashboard
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Total Employees</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">147</div>
            <p className="text-sm text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-500" />
              <CardTitle className="text-base">Active Positions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-sm text-muted-foreground">Open positions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-base">Compliance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98%</div>
            <p className="text-sm text-muted-foreground">Compliance rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/employees">
          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <ChevronRight className="h-4 w-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-gray-900 mb-1">Employee Management</h3>
              <p className="text-sm text-gray-600">Add and edit employee information</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/payroll">
          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-green-200 bg-green-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Calculator className="h-5 w-5 text-white" />
                </div>
                <ChevronRight className="h-4 w-4 text-green-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-gray-900 mb-1">Payroll Processing</h3>
              <p className="text-sm text-gray-600">Automated calculations</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics">
          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-purple-200 bg-purple-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <ChevronRight className="h-4 w-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-gray-900 mb-1">Reports & Analytics</h3>
              <p className="text-sm text-gray-600">Generate reports</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/compliance">
          <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <ChevronRight className="h-4 w-4 text-orange-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold text-gray-900 mb-1">Compliance Management</h3>
              <p className="text-sm text-gray-600">Automated compliance tracking</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}