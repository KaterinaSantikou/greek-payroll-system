import { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UsersIcon, GlobeIcon, ScaleIcon, AlertTriangleIcon } from "lucide-react";

interface AssumptionsDrawerProps {
  children: ReactNode;
}

export function AssumptionsDrawer({ children }: AssumptionsDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <div className="mx-auto w-full max-w-4xl">
          <DrawerHeader>
            <DrawerTitle>ESRS S1 Calculation Assumptions</DrawerTitle>
            <DrawerDescription>
              Key assumptions and definitions used in S1 social sustainability metrics calculations
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              
              {/* Employee Definitions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UsersIcon className="w-5 h-5" />
                    Employee vs Non-Employee Classification
                  </CardTitle>
                  <CardDescription>
                    How we classify different worker types in our calculations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Employees</Badge>
                        <span className="text-sm text-muted-foreground">Included in all metrics</span>
                      </div>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Permanent full-time and part-time staff</li>
                        <li>• Fixed-term contract workers</li>
                        <li>• Apprentices and trainees</li>
                        <li>• Staff on parental or medical leave</li>
                        <li>• Remote and hybrid workers</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Non-Employees</Badge>
                        <span className="text-sm text-muted-foreground">Limited inclusion</span>
                      </div>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• External contractors (H&S metrics only)</li>
                        <li>• Agency/temporary workers</li>
                        <li>• Consultants and freelancers</li>
                        <li>• Board members and advisors</li>
                        <li>• Interns (unpaid)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Geographic Scope */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GlobeIcon className="w-5 h-5" />
                    Included Geographies & Operations
                  </CardTitle>
                  <CardDescription>
                    Countries and operational entities included in S1 reporting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Badge variant="default">Primary Operations</Badge>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Greece (Headquarters)</li>
                        <li>• Germany (EU Operations)</li>
                        <li>• France (Regional Office)</li>
                        <li>• Italy (Hotel Properties)</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <Badge variant="secondary">Included Activities</Badge>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Corporate headquarters</li>
                        <li>• Hotel operations</li>
                        <li>• Regional offices</li>
                        <li>• Customer service centers</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <Badge variant="outline">Excluded Operations</Badge>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Joint ventures less than 50% ownership</li>
                        <li>• Franchised properties</li>
                        <li>• Construction sites (temporary)</li>
                        <li>• Divested operations</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calculation Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ScaleIcon className="w-5 h-5" />
                    Reliefs & Calculation Methods
                  </CardTitle>
                  <CardDescription>
                    ESRS reliefs applied and calculation methodologies used
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Applied ESRS Reliefs</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Art. 30: Reduced Disclosures (First-time)</Badge>
                        <Badge variant="outline">Art. 10(2): Stop-the-Clock Applied</Badge>
                        <Badge variant="outline">S1-6: Core Workforce Only</Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">FTE Calculation</h4>
                        <p className="text-sm text-muted-foreground">
                          Full-time equivalent calculated as: (Actual hours ÷ Standard full-time hours) 
                          based on 40-hour work week standard
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2">Reporting Period</h4>
                        <p className="text-sm text-muted-foreground">
                          Calendar year reporting with point-in-time measurements on December 31st 
                          and period-average calculations where specified
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Quality & Limitations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangleIcon className="w-5 h-5" />
                    Data Quality & Limitations
                  </CardTitle>
                  <CardDescription>
                    Known limitations and data quality considerations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Data Quality Indicators</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Gender data: Self-reported where available</li>
                        <li>• Pay data: From verified payroll systems</li>
                        <li>• Hours data: Digital work card timestamps</li>
                        <li>• H&S data: Incident reporting system</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Known Limitations</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Non-binary gender classification not yet captured</li>
                        <li>• Bonus data may exclude end-of-year awards</li>
                        <li>• Remote work hours partially estimated</li>
                        <li>• Minor incidents may be underreported</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                          First-time ESRS Implementation
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                          This is our first year implementing ESRS S1. Data completeness and methodologies 
                          will improve as we refine our collection processes and system integrations.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}