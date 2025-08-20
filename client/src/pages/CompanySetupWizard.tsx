import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Building2, Users, DollarSign, Coffee, HelpCircle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SectorPack {
  id: string;
  sector: string;
  name: string;
  description: string;
  categories: Array<{
    name: string;
    grades: string[];
    description: string;
  }>;
  allowances: Array<{
    code: string;
    name: string;
    defaultAmount: number;
    taxTreatment: string;
  }>;
  premiums: Array<{
    code: string;
    name: string;
    rate: number;
    description: string;
  }>;
}

const AVAILABLE_SECTOR_PACKS: SectorPack[] = [
  {
    id: "tourism-hotels",
    sector: "tourism",
    name: "Greek Tourism - Hotels CBA Pack",
    description: "Comprehensive CBA pack for hotel operations including Front Office, Housekeeping, F&B, and Management positions",
    categories: [
      { name: "Front Office", grades: ["A", "B", "C"], description: "Reception, Guest Relations, Concierge" },
      { name: "Housekeeping", grades: ["A", "B", "C"], description: "Room Attendants, Housekeeping Supervisors" },
      { name: "Food & Beverage", grades: ["A", "B", "C"], description: "Servers, Bartenders, Kitchen Staff" },
      { name: "Management", grades: ["A", "B"], description: "Department Heads, Assistant Managers" }
    ],
    allowances: [
      { code: "MEAL_ALLOW", name: "Meal Allowance", defaultAmount: 6, taxTreatment: "split" },
      { code: "ACCOM_ALLOW", name: "Accommodation Allowance", defaultAmount: 10, taxTreatment: "taxable" },
      { code: "UNIFORM_ALLOW", name: "Uniform Allowance", defaultAmount: 20, taxTreatment: "taxable" }
    ],
    premiums: [
      { code: "NIGHT_25", name: "Night Shift Premium", rate: 25, description: "22:00-06:00" },
      { code: "SUNDAY_75", name: "Sunday Work Premium", rate: 75, description: "Sunday shifts" },
      { code: "HOLIDAY_75", name: "Holiday Work Premium", rate: 75, description: "Public holidays" },
      { code: "SIXTH_DAY_40", name: "Sixth Day Premium", rate: 40, description: "6th consecutive day" }
    ]
  },
  {
    id: "fnb-restaurants",
    sector: "fnb",
    name: "F&B Restaurants & Bars CBA Pack",
    description: "Specialized for restaurant and bar operations with tip pooling and service roles",
    categories: [
      { name: "Service", grades: ["A", "B", "C"], description: "Servers, Hosts, Bartenders" },
      { name: "Kitchen", grades: ["A", "B", "C"], description: "Chefs, Prep Cooks, Dishwashers" },
      { name: "Management", grades: ["A", "B"], description: "Restaurant Manager, Shift Supervisor" }
    ],
    allowances: [
      { code: "MEAL_ALLOW", name: "Meal Allowance", defaultAmount: 8, taxTreatment: "split" },
      { code: "UNIFORM_ALLOW", name: "Uniform Allowance", defaultAmount: 25, taxTreatment: "taxable" }
    ],
    premiums: [
      { code: "NIGHT_25", name: "Night Shift Premium", rate: 25, description: "22:00-06:00" },
      { code: "SUNDAY_75", name: "Sunday Work Premium", rate: 75, description: "Sunday shifts" },
      { code: "HOLIDAY_100", name: "Holiday Work Premium", rate: 100, description: "Public holidays" }
    ]
  }
];

interface RoleMapping {
  roleName: string;
  category: string;
  grade: string;
}

interface AllowanceConfig {
  code: string;
  enabled: boolean;
  customAmount?: number;
}

interface PremiumConfig {
  code: string;
  enabled: boolean;
  customRate?: number;
}

export default function CompanySetupWizard() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPack, setSelectedPack] = useState<SectorPack | null>(null);
  const [roleMappings, setRoleMappings] = useState<RoleMapping[]>([]);
  const [allowanceConfigs, setAllowanceConfigs] = useState<AllowanceConfig[]>([]);
  const [premiumConfigs, setPremiumConfigs] = useState<PremiumConfig[]>([]);
  const [companyRoles, setCompanyRoles] = useState<string[]>(["Manager", "Assistant Manager", "Receptionist", "Housekeeper"]);
  const [newRole, setNewRole] = useState("");

  const handlePackSelection = (packId: string) => {
    const pack = AVAILABLE_SECTOR_PACKS.find(p => p.id === packId);
    setSelectedPack(pack || null);
    
    if (pack) {
      // Initialize allowance configs
      setAllowanceConfigs(pack.allowances.map(a => ({ 
        code: a.code, 
        enabled: true 
      })));
      
      // Initialize premium configs
      setPremiumConfigs(pack.premiums.map(p => ({ 
        code: p.code, 
        enabled: p.code !== "SIXTH_DAY_40" // Sixth day disabled by default
      })));
      
      // Initialize role mappings
      setRoleMappings(companyRoles.map(role => ({
        roleName: role,
        category: pack.categories[0].name,
        grade: "B"
      })));
    }
  };

  const addRole = () => {
    if (newRole.trim() && !companyRoles.includes(newRole.trim())) {
      const updatedRoles = [...companyRoles, newRole.trim()];
      setCompanyRoles(updatedRoles);
      
      if (selectedPack) {
        setRoleMappings(prev => [...prev, {
          roleName: newRole.trim(),
          category: selectedPack.categories[0].name,
          grade: "B"
        }]);
      }
      
      setNewRole("");
    }
  };

  const updateRoleMapping = (roleName: string, field: 'category' | 'grade', value: string) => {
    setRoleMappings(prev => prev.map(mapping => 
      mapping.roleName === roleName 
        ? { ...mapping, [field]: value }
        : mapping
    ));
  };

  const toggleAllowance = (code: string, enabled: boolean) => {
    setAllowanceConfigs(prev => prev.map(config => 
      config.code === code ? { ...config, enabled } : config
    ));
  };

  const togglePremium = (code: string, enabled: boolean) => {
    setPremiumConfigs(prev => prev.map(config => 
      config.code === code ? { ...config, enabled } : config
    ));
  };

  const handleFinishSetup = async () => {
    try {
      const setupData = {
        sectorPack: selectedPack,
        roleMappings,
        allowanceConfigs,
        premiumConfigs
      };

      // TODO: Submit to backend
      console.log("Company setup data:", setupData);
      
      toast({
        title: "Setup Complete!",
        description: "Your company CBA configuration has been saved successfully.",
      });
      
      // Redirect to dashboard
      // window.location.href = "/";
      
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "There was an error saving your configuration. Please try again.",
        variant: "destructive"
      });
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Setup Wizard</h1>
          <p className="text-gray-600">Configure your Greek CBA compliance settings</p>
          
          {/* Progress */}
          <div className="flex items-center justify-center mt-6 space-x-4">
            {[1, 2, 3, 4].map(step => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step}
                </div>
                {step < 4 && <div className={`w-12 h-1 ${step < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Sector Pack */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Select Your Industry Sector Pack
              </CardTitle>
              <CardDescription>
                Choose the CBA pack that best matches your business sector
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {AVAILABLE_SECTOR_PACKS.map(pack => (
                <div 
                  key={pack.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPack?.id === pack.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePackSelection(pack.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{pack.name}</h3>
                      <p className="text-gray-600 mt-1">{pack.description}</p>
                      <div className="flex gap-2 mt-3">
                        {pack.categories.map(cat => (
                          <Badge key={cat.name} variant="secondary">{cat.name}</Badge>
                        ))}
                      </div>
                    </div>
                    {selectedPack?.id === pack.id && (
                      <CheckCircle2 className="w-6 h-6 text-blue-600 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure Roles & Grades */}
        {currentStep === 2 && selectedPack && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Map Company Roles to CBA Categories
              </CardTitle>
              <CardDescription>
                Define how your job roles map to CBA categories and grades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Role */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add new company role..."
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRole()}
                />
                <Button onClick={addRole}>Add Role</Button>
              </div>

              <Separator />

              {/* Role Mappings */}
              <div className="space-y-4">
                {roleMappings.map(mapping => (
                  <div key={mapping.roleName} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <Label className="font-medium">{mapping.roleName}</Label>
                    </div>
                    <div className="flex-1">
                      <Select 
                        value={mapping.category}
                        onValueChange={(value) => updateRoleMapping(mapping.roleName, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPack.categories.map(cat => (
                            <SelectItem key={cat.name} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <Select 
                        value={mapping.grade}
                        onValueChange={(value) => updateRoleMapping(mapping.roleName, 'grade', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedPack.categories
                            .find(cat => cat.name === mapping.category)
                            ?.grades.map(grade => (
                              <SelectItem key={grade} value={grade}>
                                Grade {grade}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Configure Allowances */}
        {currentStep === 3 && selectedPack && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Configure Allowances & Premiums
              </CardTitle>
              <CardDescription>
                Enable and customize allowances and premium rates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allowances */}
              <div>
                <h3 className="font-semibold mb-4">Allowances</h3>
                <div className="space-y-3">
                  {selectedPack.allowances.map(allowance => (
                    <div key={allowance.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="font-medium">{allowance.name}</Label>
                        <p className="text-sm text-gray-600">
                          Default: €{allowance.defaultAmount} ({allowance.taxTreatment})
                        </p>
                      </div>
                      <Switch 
                        checked={allowanceConfigs.find(c => c.code === allowance.code)?.enabled || false}
                        onCheckedChange={(checked) => toggleAllowance(allowance.code, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Premiums */}
              <div>
                <h3 className="font-semibold mb-4">Premium Rates</h3>
                <div className="space-y-3">
                  {selectedPack.premiums.map(premium => (
                    <div key={premium.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <Label className="font-medium">{premium.name}</Label>
                        <p className="text-sm text-gray-600">
                          {premium.rate}% - {premium.description}
                        </p>
                        {premium.code === "SIXTH_DAY_40" && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            <HelpCircle className="w-3 h-3 mr-1" />
                            Tourism default: disabled unless override
                          </Badge>
                        )}
                      </div>
                      <Switch 
                        checked={premiumConfigs.find(c => c.code === premium.code)?.enabled || false}
                        onCheckedChange={(checked) => togglePremium(premium.code, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Special case for F&B: Tips */}
              {selectedPack.sector === "fnb" && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Coffee className="w-4 h-4" />
                      Tip Pool Configuration
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Pool Source</Label>
                        <Select defaultValue="pos_revenue">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pos_revenue">POS Revenue %</SelectItem>
                            <SelectItem value="cash_tips">Cash Tips</SelectItem>
                            <SelectItem value="card_tips">Card Tips</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Distribution Method</Label>
                        <Select defaultValue="points">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="points">Points-based</SelectItem>
                            <SelectItem value="hours">Hours worked</SelectItem>
                            <SelectItem value="equal">Equal distribution</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review & Complete */}
        {currentStep === 4 && selectedPack && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Review Configuration
              </CardTitle>
              <CardDescription>
                Confirm your CBA setup before completing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selected Pack */}
              <div>
                <h3 className="font-semibold mb-2">Selected Sector Pack</h3>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-medium">{selectedPack.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{selectedPack.description}</p>
                </div>
              </div>

              {/* Role Mappings Summary */}
              <div>
                <h3 className="font-semibold mb-2">Role Mappings ({roleMappings.length})</h3>
                <div className="space-y-1">
                  {roleMappings.slice(0, 3).map(mapping => (
                    <p key={mapping.roleName} className="text-sm text-gray-600">
                      <span className="font-medium">{mapping.roleName}</span> → {mapping.category} Grade {mapping.grade}
                    </p>
                  ))}
                  {roleMappings.length > 3 && (
                    <p className="text-sm text-gray-500">...and {roleMappings.length - 3} more</p>
                  )}
                </div>
              </div>

              {/* Enabled Features */}
              <div>
                <h3 className="font-semibold mb-2">Enabled Features</h3>
                <div className="flex gap-2 flex-wrap">
                  {allowanceConfigs.filter(c => c.enabled).map(config => (
                    <Badge key={config.code} variant="secondary">
                      {selectedPack.allowances.find(a => a.code === config.code)?.name}
                    </Badge>
                  ))}
                  {premiumConfigs.filter(c => c.enabled).map(config => (
                    <Badge key={config.code} variant="outline">
                      {selectedPack.premiums.find(p => p.code === config.code)?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep < 4 ? (
              <Button 
                onClick={nextStep}
                disabled={currentStep === 1 && !selectedPack}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleFinishSetup}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}