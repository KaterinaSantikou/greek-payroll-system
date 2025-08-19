import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Scale, Shield, AlertTriangle, CheckCircle, Clock, Euro, FileText, Search } from "lucide-react";

interface PolicySection {
  id: string;
  title: string;
  content: string;
  compliance: string[];
  examples?: string[];
}

const POLICY_SECTIONS: PolicySection[] = [
  {
    id: "overview",
    title: "Policy Overview & Scope",
    content: "This policy establishes standardized earnings codes for Greek payroll operations, ensuring compliance with Greek labor law, tax regulations (AADE), social security requirements (EFKA), and APD reporting obligations. All payroll processing must adhere to these classifications to maintain legal compliance and audit integrity.",
    compliance: ["Greek Labor Law", "AADE Tax Code", "EFKA Regulations", "APD Reporting Standards"]
  },
  {
    id: "regular-hours",
    title: "Regular Hours & Base Wages",
    content: "REG (Regular Hours): Represents the employee's base wage. Calculated as hours multiplied by the agreed hourly rate. Fully taxable, contributory to EFKA, and included in APD. This code does not stack with any other earnings type. Forms the foundation for premium calculations but is recorded separately from premium payments.",
    compliance: ["40-hour standard work week", "Minimum wage compliance", "ERGANI II time tracking", "No stacking with other earnings"],
    examples: ["40 hours × €15.50 = €620.00 (standalone)", "REG cannot combine with premiums in same line", "Premiums reference REG for calculations but are separate entries"]
  },
  {
    id: "premium-rates",
    title: "Premium Rate Classifications",
    content: "Greek law mandates specific premium rates for non-standard working conditions. These rates are legally required and cannot be reduced below statutory minimums. All premiums may stack with each other but are recorded separately from REG (Regular Hours). Work permits required for Sunday and holiday premiums where applicable.",
    compliance: ["Sunday work permits required where applicable", "Holiday work authorization", "Night work band compliance (22:00-06:00)", "Sixth-day eligibility verification"],
    examples: [
      "NIGHT_25: 25% premium for hours between 22:00-06:00, stackable",
      "SUNDAY_75: 75% premium with legal work permit, stackable",
      "HOLIDAY_75: 75% premium for public holiday work, stackable",
      "SIXTH_DAY_40: 40% premium, disabled by default for hospitality"
    ]
  },
  {
    id: "overtime-policy",
    title: "Three-Tier Overtime System",
    content: "Greece operates a sophisticated overtime system with annual caps and escalating rates. Legal Overtime (40%) applies within the 150-hour annual limit. Overtime Above Cap (60%) requires permits for hours beyond the cap. Non-Authorised Overtime (80%) applies to exceptional cases worked without authorization and triggers compliance alerts.",
    compliance: ["150-hour annual overtime cap", "Ministry permits for excess hours", "Compliance alerts for non-authorised overtime", "Strict workflows for exceptional cases"],
    examples: [
      "OT_TIER1_40: Within 150-hour annual cap at 40% premium",
      "OT_TIER2_60: Beyond cap with required permit at 60% premium", 
      "OT_EXCEPTIONAL_80: Non-authorised cases at 80% premium with alerts"
    ]
  },
  {
    id: "greek-bonuses",
    title: "Mandatory Greek Bonuses",
    content: "Greek employment law mandates specific bonuses based on tenure and earnings. Easter Bonus (Δώρο Πάσχα) and Christmas Bonus (Δώρο Χριστουγέννων) are calculated using tenure-based formulas and must be prorated for partial service. Leave Allowance (Επίδομα Άδειας) follows similar rules but is not stackable with other components.",
    compliance: ["Tenure-based calculation formulas", "Proration for partial service periods", "Full tax and EFKA treatment"],
    examples: [
      "BONUS_EASTER: 15 days for <1 year, 25 days for >5 years",
      "BONUS_CHRISTMAS: Similar to Easter with December calculation",
      "ALLOWANCE_LEAVE: 50% of monthly wage plus allowances"
    ]
  },
  {
    id: "allowances-tips",
    title: "Allowances & Tip Distribution",
    content: "Allowances receive special tax treatment up to statutory limits. Meal vouchers are tax-free up to €6 per workday with automatic excess splitting. Tips distributed through employer pooling are always taxable, with EFKA treatment configurable by role. Travel per diems follow domestic/foreign statutory limits with excess reclassification.",
    compliance: ["€6/day meal voucher tax-free limit", "Automatic tax splitting for excess amounts", "Tip pooling documentation requirements"],
    examples: [
      "MEAL_VOUCHER: €6/day tax-free, excess taxable",
      "TIPS_DISTRIBUTED: Always taxable, EFKA per arrangement",
      "TRAVEL_PER_DIEM: Within limits tax-free, excess taxable"
    ]
  },
  {
    id: "sick-leave",
    title: "Sick Pay & Benefits Coverage",
    content: "Employer covers first three days at 50% (SICK_EMP_50), fully taxable and contributory. EFKA benefits begin from day four and are recorded separately as informational only (SICK_EFKA) - not considered wages, hence non-taxable and non-contributory. Proper medical documentation required for all sick leave.",
    compliance: ["3-day employer coverage period", "Medical certificate requirements", "EFKA coordination procedures"],
    examples: [
      "SICK_EMP_50: Days 1-3 at 50% regular pay",
      "SICK_EFKA: Day 4+ EFKA benefits (informational)",
      "Medical documentation required for all periods"
    ]
  },
  {
    id: "compliance-rules",
    title: "Compliance & Stacking Rules",
    content: "Earnings codes follow specific stacking rules to ensure legal compliance. REG (Regular Hours) does not stack with any other earnings type and must be recorded as separate payroll lines. Premiums can stack with each other but reference REG for calculations. Certain codes like ALLOWANCE_LEAVE and TIPS_DISTRIBUTED are non-stackable. Exceptional overtime triggers mandatory compliance alerts.",
    compliance: ["REG recorded separately from all premiums", "Stacking validation requirements", "Compliance alert triggers", "Audit trail maintenance"],
    examples: [
      "REG = €620.00 (separate line)",
      "NIGHT_25 + SUNDAY_75 + OT_TIER1_40 = Valid stacking",
      "REG + NIGHT_25 = Invalid (must be separate lines)",
      "OT_EXCEPTIONAL_80 = Triggers compliance review"
    ]
  }
];

const TAX_TREATMENT_GUIDE = {
  taxable: {
    title: "Taxable Income Components",
    description: "Subject to Greek income tax brackets: 0% up to €10,000, 9% €10,001-€20,000, 22% €20,001-€30,000, 28% above €30,000",
    codes: ["REG", "NIGHT_25", "SUNDAY_75", "HOLIDAY_75", "OT_TIER1_40", "OT_TIER2_60", "OT_EXCEPTIONAL_80", "BONUS_EASTER", "BONUS_CHRISTMAS", "ALLOWANCE_LEAVE", "TIPS_DISTRIBUTED", "SICK_EMP_50", "HOLIDAY_NOT_WORKED"]
  },
  nonTaxable: {
    title: "Tax-Free Components",
    description: "Not subject to income tax within statutory limits. Excess amounts automatically reclassified as taxable income",
    codes: ["MEAL_VOUCHER", "TRAVEL_PER_DIEM", "SICK_EFKA"]
  },
  efkaContributory: {
    title: "EFKA Contributory Base",
    description: "Subject to social security contributions: Employee 16%, Employer 24-28% depending on category",
    codes: ["REG", "NIGHT_25", "SUNDAY_75", "HOLIDAY_75", "OT_TIER1_40", "OT_TIER2_60", "OT_EXCEPTIONAL_80", "BONUS_EASTER", "BONUS_CHRISTMAS", "ALLOWANCE_LEAVE", "TIPS_DISTRIBUTED", "SICK_EMP_50", "HOLIDAY_NOT_WORKED"]
  },
  apdReporting: {
    title: "APD Reporting Requirements",
    description: "Must be included in monthly APD declarations to Greek authorities for statistical and compliance monitoring",
    codes: ["REG", "NIGHT_25", "SUNDAY_75", "HOLIDAY_75", "OT_TIER1_40", "OT_TIER2_60", "OT_EXCEPTIONAL_80", "BONUS_EASTER", "BONUS_CHRISTMAS", "ALLOWANCE_LEAVE", "TIPS_DISTRIBUTED", "SICK_EMP_50", "HOLIDAY_NOT_WORKED", "MEAL_VOUCHER"]
  }
};

export default function EarningsCodesPolicyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSection, setSelectedSection] = useState("overview");

  const { data: earningsCodesData, isLoading } = useQuery({
    queryKey: ["/api/earnings-codes/rules"],
  });

  const filteredSections = POLICY_SECTIONS.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Scale className="h-8 w-8 text-blue-600" />
              Earnings Codes Policy (Greece 2025)
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Official policy document defining standardized earnings codes, calculation rules, and compliance treatment for Greek payroll operations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Shield className="h-3 w-3 mr-1" />
              Compliance Required
            </Badge>
            <Badge variant="default" className="px-3 py-1">
              <CheckCircle className="h-3 w-3 mr-1" />
              2025 Current
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search policy sections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="policy" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="policy">Policy Sections</TabsTrigger>
          <TabsTrigger value="tax-treatment">Tax Treatment</TabsTrigger>
          <TabsTrigger value="quick-reference">Quick Reference</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="policy" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Navigation */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Policy Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {filteredSections.map((section) => (
                      <Button
                        key={section.id}
                        variant={selectedSection === section.id ? "default" : "ghost"}
                        className="w-full justify-start text-sm h-auto p-3"
                        onClick={() => setSelectedSection(section.id)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{section.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {section.compliance.length} compliance rules
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Content */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {filteredSections.find(s => s.id === selectedSection)?.title}
                </CardTitle>
                <CardDescription>
                  Mandatory compliance requirements for Greek payroll operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {filteredSections
                    .filter(section => section.id === selectedSection)
                    .map((section) => (
                      <div key={section.id} className="space-y-4">
                        <div className="prose max-w-none">
                          <p className="text-sm leading-relaxed">{section.content}</p>
                        </div>

                        {/* Compliance Requirements */}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-600" />
                            Compliance Requirements
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {section.compliance.map((requirement, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                <span>{requirement}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Examples */}
                        {section.examples && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <FileText className="h-4 w-4 text-purple-600" />
                              Examples
                            </h4>
                            <div className="bg-muted p-3 rounded-lg">
                              <div className="space-y-1">
                                {section.examples.map((example, index) => (
                                  <div key={index} className="text-sm font-mono">
                                    {example}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax-treatment" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(TAX_TREATMENT_GUIDE).map(([key, treatment]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {key === 'taxable' && <Euro className="h-5 w-5 text-red-600" />}
                    {key === 'nonTaxable' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {key === 'efkaContributory' && <Shield className="h-5 w-5 text-blue-600" />}
                    {key === 'apdReporting' && <FileText className="h-5 w-5 text-purple-600" />}
                    {treatment.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {treatment.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {treatment.codes.map((code) => (
                      <Badge key={code} variant="outline" className="text-xs font-mono">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quick-reference" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Premium Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Premium Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Night (22:00-06:00)</span>
                    <Badge variant="outline">25%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday Work</span>
                    <Badge variant="outline">75%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Public Holidays</span>
                    <Badge variant="outline">75%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Sixth Day</span>
                    <Badge variant="outline">40%</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>OT Tier 1</span>
                    <Badge variant="default">40%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>OT Tier 2</span>
                    <Badge variant="default">60%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>OT Exceptional</span>
                    <Badge variant="destructive">80%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Brackets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2025 Tax Brackets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Up to €10,000</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">0%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>€10,001-€20,000</span>
                    <Badge variant="outline">9%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>€20,001-€30,000</span>
                    <Badge variant="outline">22%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Above €30,000</span>
                    <Badge variant="destructive">28%</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span>EFKA Employee</span>
                    <Badge variant="secondary">16%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>EFKA Employer</span>
                    <Badge variant="secondary">24-28%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Statutory Limits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Annual Overtime Cap</span>
                    <Badge variant="outline">150 hours</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Meal Voucher Tax-Free</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">€6/day</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Wage 2025</span>
                    <Badge variant="outline">€880/month</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Sick Pay Coverage</span>
                    <Badge variant="outline">3 days @ 50%</Badge>
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      <span className="text-xs">Work permits required for Sunday/Holiday</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Mandatory Compliance Checklist
              </CardTitle>
              <CardDescription>
                Essential compliance requirements for Greek payroll administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Before Payroll Processing</h3>
                    <div className="space-y-2">
                      {[
                        "Verify all work permits for Sunday/Holiday hours",
                        "Validate overtime hours against annual caps",
                        "Confirm stacking combinations are legally compliant",
                        "Check meal voucher limits (€6/day maximum)",
                        "Review sick pay medical documentation"
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-green-600 mt-1 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">During Payroll Processing</h3>
                    <div className="space-y-2">
                      {[
                        "Apply correct tax treatment per earnings code",
                        "Calculate EFKA contributions accurately",
                        "Generate compliance alerts for exceptional overtime",
                        "Validate tenure-based bonus calculations",
                        "Ensure proper APD reporting classifications"
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-blue-600 mt-1 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Post-Processing Requirements</h3>
                    <div className="space-y-2">
                      {[
                        "Submit ERGANI II declarations within deadlines",
                        "File monthly APD reports accurately",
                        "Maintain audit trail for all calculations",
                        "Archive compliance documentation",
                        "Update employee records in government systems"
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-3 w-3 text-purple-600 mt-1 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-red-600">Critical Alerts</h3>
                    <div className="space-y-2">
                      {[
                        "OT_EXCEPTIONAL_80 requires immediate compliance review",
                        "Missing work permits invalidate Sunday/Holiday premiums",
                        "Excess meal vouchers must be reclassified as taxable",
                        "EFKA coordination required for sick pay beyond 3 days",
                        "Annual overtime cap violations require ministry permits"
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-3 w-3 text-red-600 mt-1 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}