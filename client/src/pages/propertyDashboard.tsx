import { useProperty } from "@/contexts/PropertyContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, Building2, Euro, TrendingUp, Clock, AlertTriangle, 
  BarChart3, MapPin, Calendar, Settings
} from "lucide-react";

interface PropertyStats {
  propertyId: string;
  name: string;
  activeEmployees: number;
  monthlyLabourCost: number;
}

interface GroupStats {
  summary: {
    totalProperties: number;
    totalEmployees: number;
    propertiesWithEmployees: number;
  };
  breakdown: {
    propertyId: string;
    name: string;
    employeeCount: number;
    costCenterCode: string;
  }[];
  totalMonthlyLabourCost: number;
}

export default function PropertyDashboard() {
  const { selectedPropertyId, selectedProperty, isGroupView } = useProperty();

  // Property-specific stats
  const { data: propertyStats, isLoading: statsLoading } = useQuery<PropertyStats>({
    queryKey: ["/api/properties/stats", selectedPropertyId],
    enabled: !isGroupView && selectedPropertyId !== 'group'
  });

  // Group view stats
  const { data: groupStats, isLoading: groupLoading } = useQuery<GroupStats>({
    queryKey: ["/api/properties/group-stats"],
    enabled: isGroupView
  });

  if (isGroupView) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Group Overview</h2>
            <p className="text-muted-foreground">
              Consolidated view across all properties
            </p>
          </div>
        </div>

        {groupLoading ? (
          <div>Loading group statistics...</div>
        ) : groupStats ? (
          <>
            {/* Group Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{groupStats.summary.totalProperties}</div>
                  <p className="text-xs text-muted-foreground">
                    {groupStats.summary.propertiesWithEmployees} active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{groupStats.summary.totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all properties
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Labor Cost</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{Math.round(groupStats.totalMonthlyLabourCost).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Group total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Cost per Employee</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{Math.round(groupStats.totalMonthlyLabourCost / groupStats.summary.totalEmployees).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per employee/month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Property Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Property Breakdown</CardTitle>
                <CardDescription>
                  Employee distribution and costs across properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groupStats.breakdown.map((property) => (
                    <div key={property.propertyId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{property.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {property.costCenterCode}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="text-sm font-medium flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {property.employeeCount} employees
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            €{Math.round(property.employeeCount * 2500).toLocaleString()}/mo
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div>No group data available</div>
        )}
      </div>
    );
  }

  // Property-specific view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {selectedProperty?.name || "Property Dashboard"}
          </h2>
          <p className="text-muted-foreground flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {selectedProperty?.address || "Property overview and analytics"}
          </p>
        </div>
        <Badge variant="outline" className="text-blue-600">
          {selectedProperty?.costCenterCode}
        </Badge>
      </div>

      {statsLoading ? (
        <div>Loading property statistics...</div>
      ) : propertyStats ? (
        <>
          {/* Property Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{propertyStats.activeEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  Assigned to this property
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Labor Cost</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{propertyStats.monthlyLabourCost?.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Current month projection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost per Employee</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{Math.round((propertyStats.monthlyLabourCost || 0) / Math.max(propertyStats.activeEmployees, 1)).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average per employee/month
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Property-specific tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="employees">Employees</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-green-500" />
                        <span>All employees checked in on time today</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span>2 overtime pre-approvals pending</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>1 new employee onboarded this week</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer">
                      <span>View Employee Schedules</span>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer">
                      <span>Property Settings</span>
                      <Settings className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="employees">
              <Card>
                <CardHeader>
                  <CardTitle>Employee Management</CardTitle>
                  <CardDescription>
                    Manage employees assigned to {selectedProperty?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Employee list and management features will be displayed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Property Analytics</CardTitle>
                  <CardDescription>
                    Performance metrics and insights for {selectedProperty?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Property-specific analytics and reports will be displayed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compliance">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Status</CardTitle>
                  <CardDescription>
                    ERGANI, EFKA, and legal compliance for {selectedProperty?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Property-specific compliance monitoring will be displayed here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div>No property data available</div>
      )}
    </div>
  );
}