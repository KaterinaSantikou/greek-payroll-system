import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Gift,
  Euro,
  Users,
  Calendar,
  Calculator,
  Settings,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  GREEK_HOLIDAY_BONUSES,
  REGULAR_ALLOWANCES,
  INDUSTRY_ALLOWANCES,
  FAMILY_ALLOWANCES,
  calculateHolidayBonus,
  calculateRegularAllowance,
  calculateIndustryAllowance,
  calculateFamilyAllowances,
  calculateTotalAllowances,
  getAllowanceOptions,
} from '@/lib/allowancesCalculations';

export default function AllowancesPage() {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeData, setEmployeeData] = useState({
    baseSalary: 1200,
    serviceMonths: 12,
    isMarried: false,
    numberOfChildren: 0,
    childrenAges: [] as number[],
    industry: 'general',
  });

  const [selectedAllowances, setSelectedAllowances] = useState<
    Array<{
      id: string;
      type: string;
      subType?: string;
      amount?: number;
      performanceData?: any;
    }>
  >([]);

  const [calculationResults, setCalculationResults] = useState<any>(null);

  const handleCalculateAllowances = () => {
    const results = calculateTotalAllowances(
      employeeData.baseSalary,
      selectedAllowances,
      employeeData
    );
    setCalculationResults(results);
  };

  const addAllowance = (allowanceType: string) => {
    const newAllowance = {
      id: Math.random().toString(36).substr(2, 9),
      type: allowanceType,
      amount: 0,
    };
    setSelectedAllowances([...selectedAllowances, newAllowance]);
  };

  const removeAllowance = (id: string) => {
    setSelectedAllowances(selectedAllowances.filter(a => a.id !== id));
  };

  const updateAllowance = (id: string, field: string, value: any) => {
    setSelectedAllowances(
      selectedAllowances.map(allowance =>
        allowance.id === id ? { ...allowance, [field]: value } : allowance
      )
    );
  };

  const allowanceOptions = getAllowanceOptions();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Gift className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold">Επιδόματα & Δώρα</h1>
          <p className="text-gray-600">
            Διαχείριση επιδομάτων, δώρων εορτών και οικογενειακών παροχών
          </p>
        </div>
      </div>

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator">Υπολογιστής</TabsTrigger>
          <TabsTrigger value="holiday-bonuses">Δώρα Εορτών</TabsTrigger>
          <TabsTrigger value="regular-allowances">
            Τακτικά Επιδόματα
          </TabsTrigger>
          <TabsTrigger value="industry-specific">Κλαδικά Επιδόματα</TabsTrigger>
        </TabsList>

        {/* Allowances Calculator */}
        <TabsContent value="calculator">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Στοιχεία Εργαζομένου
                </CardTitle>
                <CardDescription>
                  Εισάγετε τα βασικά στοιχεία για υπολογισμό επιδομάτων
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="baseSalary">Βασικός Μισθός (€)</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    value={employeeData.baseSalary}
                    onChange={e =>
                      setEmployeeData({
                        ...employeeData,
                        baseSalary: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="serviceMonths">Μήνες Υπηρεσίας</Label>
                  <Input
                    id="serviceMonths"
                    type="number"
                    value={employeeData.serviceMonths}
                    onChange={e =>
                      setEmployeeData({
                        ...employeeData,
                        serviceMonths: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="industry">Κλάδος</Label>
                  <Select
                    value={employeeData.industry}
                    onValueChange={value =>
                      setEmployeeData({ ...employeeData, industry: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Γενικός</SelectItem>
                      <SelectItem value="BANKING">Τραπεζικός</SelectItem>
                      <SelectItem value="TOURISM">Τουριστικός</SelectItem>
                      <SelectItem value="CONSTRUCTION">Οικοδομικός</SelectItem>
                      <SelectItem value="HEALTHCARE">Υγειονομικός</SelectItem>
                      <SelectItem value="COMMERCE">Εμπορικός</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Οικογενειακή Κατάσταση</h4>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="married"
                      checked={employeeData.isMarried}
                      onCheckedChange={checked =>
                        setEmployeeData({ ...employeeData, isMarried: checked })
                      }
                    />
                    <Label htmlFor="married">Παντρεμένος/η</Label>
                  </div>

                  <div>
                    <Label htmlFor="numberOfChildren">Αριθμός Τέκνων</Label>
                    <Input
                      id="numberOfChildren"
                      type="number"
                      min="0"
                      max="10"
                      value={employeeData.numberOfChildren}
                      onChange={e => {
                        const count = parseInt(e.target.value) || 0;
                        setEmployeeData({
                          ...employeeData,
                          numberOfChildren: count,
                          childrenAges: Array(count)
                            .fill(0)
                            .map((_, i) => employeeData.childrenAges[i] || 10),
                        });
                      }}
                    />
                  </div>

                  {employeeData.numberOfChildren > 0 && (
                    <div className="space-y-2">
                      <Label>Ηλικίες Τέκνων</Label>
                      {Array(employeeData.numberOfChildren)
                        .fill(0)
                        .map((_, index) => (
                          <Input
                            key={index}
                            type="number"
                            placeholder={`Ηλικία ${index + 1}ου τέκνου`}
                            min="0"
                            max="25"
                            value={employeeData.childrenAges[index] || ''}
                            onChange={e => {
                              const newAges = [...employeeData.childrenAges];
                              newAges[index] = parseInt(e.target.value) || 0;
                              setEmployeeData({
                                ...employeeData,
                                childrenAges: newAges,
                              });
                            }}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Επιλογή Επιδομάτων
                </CardTitle>
                <CardDescription>
                  Προσθέστε επιδόματα για τον εργαζόμενο
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {selectedAllowances.map(allowance => {
                    const option = allowanceOptions.find(
                      opt => opt.value === allowance.type
                    );
                    return (
                      <div
                        key={allowance.id}
                        className="flex items-center gap-2 p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <Select
                            value={allowance.type}
                            onValueChange={value =>
                              updateAllowance(allowance.id, 'type', value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Επιλέξτε επίδομα" />
                            </SelectTrigger>
                            <SelectContent>
                              {allowanceOptions.map(option => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {option.category}
                                    </Badge>
                                    {option.label}
                                    {option.mandatory && (
                                      <Badge
                                        variant="default"
                                        className="text-xs"
                                      >
                                        Υποχρεωτικό
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {option && (
                            <p className="text-xs text-gray-600 mt-1">
                              {option.description}
                            </p>
                          )}
                        </div>

                        {allowance.type &&
                          !allowance.type.includes('CHRISTMAS') &&
                          !allowance.type.includes('EASTER') &&
                          !allowance.type.includes('VACATION') && (
                            <Input
                              type="number"
                              placeholder="Ποσό"
                              className="w-24"
                              value={allowance.amount || ''}
                              onChange={e =>
                                updateAllowance(
                                  allowance.id,
                                  'amount',
                                  parseFloat(e.target.value)
                                )
                              }
                            />
                          )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAllowance(allowance.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={() => addAllowance('')}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Προσθήκη Επιδόματος
                </Button>

                <Button
                  onClick={handleCalculateAllowances}
                  className="w-full"
                  size="lg"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Υπολογισμός Επιδομάτων
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Calculation Results */}
          {calculationResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Αποτελέσματα Υπολογισμού
                </CardTitle>
                <CardDescription>
                  Αναλυτικός υπολογισμός επιδομάτων και δώρων
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      €{calculationResults.totalMonthlyAllowances.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Μηνιαία Επιδόματα
                    </div>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      €{calculationResults.totalAnnualBonuses.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Ετήσια Δώρα</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      €
                      {(
                        calculationResults.totalMonthlyAllowances * 12 +
                        calculationResults.totalAnnualBonuses
                      ).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Συνολικό Ετήσιο</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Allowances Breakdown */}
                  <div>
                    <h4 className="font-medium mb-3">
                      Ανάλυση Μηνιαίων Επιδομάτων
                    </h4>
                    <div className="space-y-2">
                      {calculationResults.breakdown.map(
                        (item: any, index: number) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-2 border rounded"
                          >
                            <div>
                              <span className="font-medium">
                                {item.description}
                              </span>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.category}
                                </Badge>
                                <Badge
                                  variant={
                                    item.taxable ? 'destructive' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {item.taxable ? 'Φορολογητέο' : 'Αφορολόγητο'}
                                </Badge>
                              </div>
                            </div>
                            <span className="font-bold">
                              €{item.amount.toFixed(2)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Holiday Bonuses */}
                  <div>
                    <h4 className="font-medium mb-3">Δώρα Εορτών</h4>
                    <div className="space-y-2">
                      {calculationResults.holidayBonuses.map(
                        (bonus: any, index: number) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-2 border rounded"
                          >
                            <div>
                              <span className="font-medium">
                                {bonus.description}
                              </span>
                              <div className="text-sm text-gray-600">
                                Πληρωμή:{' '}
                                {typeof bonus.month === 'number'
                                  ? `Μήνας ${bonus.month}`
                                  : bonus.month}
                              </div>
                            </div>
                            <span className="font-bold">
                              €{bonus.amount.toFixed(2)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Holiday Bonuses Reference */}
        <TabsContent value="holiday-bonuses">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(GREEK_HOLIDAY_BONUSES).map(([key, bonus]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {bonus.name}
                  </CardTitle>
                  <CardDescription>{bonus.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Ποσοστό μισθού:</span>
                    <Badge variant="default">
                      {(bonus.rate * 100).toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <span>Ελάχιστη υπηρεσία:</span>
                    <Badge variant="outline">
                      {bonus.minimumServiceMonths} μήνες
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <span>Αναλογική καταβολή:</span>
                    <Badge variant={bonus.proRated ? 'default' : 'secondary'}>
                      {bonus.proRated ? 'Ναι' : 'Όχι'}
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <span>Υποχρεωτικό:</span>
                    <Badge
                      variant={bonus.mandatory ? 'destructive' : 'secondary'}
                    >
                      {bonus.mandatory ? 'Ναι' : 'Όχι'}
                    </Badge>
                  </div>

                  <div className="flex justify-between">
                    <span>Φορολογητέο:</span>
                    <Badge
                      variant={bonus.taxable ? 'destructive' : 'secondary'}
                    >
                      {bonus.taxable ? 'Ναι' : 'Όχι'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Regular Allowances Reference */}
        <TabsContent value="regular-allowances">
          <div className="space-y-6">
            {Object.entries(REGULAR_ALLOWANCES).map(([key, allowance]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle>{allowance.name}</CardTitle>
                  <CardDescription>{allowance.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(allowance.types).map(
                      ([subKey, subType]) => (
                        <div key={subKey} className="p-3 border rounded-lg">
                          <h5 className="font-medium">{subType.name}</h5>
                          <div className="mt-2 space-y-1 text-sm">
                            {'percentage' in subType && (
                              <div>
                                Ποσοστό: {subType.percentage * 100}% μισθού
                              </div>
                            )}
                            {'fixedAmount' in subType && (
                              <div>Σταθερό ποσό: €{subType.fixedAmount}</div>
                            )}
                            {'maxMonthly' in subType && (
                              <div>Μέγιστο μηνιαίο: €{subType.maxMonthly}</div>
                            )}
                            {'maxDaily' in subType && (
                              <div>Μέγιστο ημερήσιο: €{subType.maxDaily}</div>
                            )}
                            {'taxExempt' in subType && (
                              <div className="text-green-600">
                                Αφορολόγητο όριο: €{subType.taxExempt}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Badge
                      variant={
                        allowance.mandatory ? 'destructive' : 'secondary'
                      }
                    >
                      {allowance.mandatory ? 'Υποχρεωτικό' : 'Προαιρετικό'}
                    </Badge>
                    <Badge
                      variant={allowance.taxable ? 'destructive' : 'default'}
                    >
                      {allowance.taxable ? 'Φορολογητέο' : 'Αφορολόγητο'}
                    </Badge>
                    {(allowance as any).socialSecurityExempt && (
                      <Badge variant="default">Ασφαλιστικά Αφορολόγητο</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Industry-Specific Allowances */}
        <TabsContent value="industry-specific">
          <div className="space-y-6">
            {Object.entries(INDUSTRY_ALLOWANCES).map(([industry, config]) => (
              <Card key={industry}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {config.name}
                  </CardTitle>
                  <CardDescription>
                    Ειδικά επιδόματα για τον {config.name.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(config.allowances).map(
                      ([key, allowanceConfig]) => (
                        <div key={key} className="p-3 border rounded-lg">
                          <h5 className="font-medium">
                            {allowanceConfig.name}
                          </h5>
                          <p className="text-sm text-gray-600 mt-1">
                            {allowanceConfig.description}
                          </p>
                          <div className="mt-2 space-y-1 text-sm">
                            {'percentage' in allowanceConfig && (
                              <div>
                                Ποσοστό: {allowanceConfig.percentage * 100}%
                                μισθού
                              </div>
                            )}
                            {'fixedAmount' in allowanceConfig && (
                              <div>
                                Σταθερό ποσό: €{allowanceConfig.fixedAmount}
                                /μήνα
                              </div>
                            )}
                            {'calculation' in allowanceConfig && (
                              <div className="text-blue-600">
                                Υπολογισμός:{' '}
                                {allowanceConfig.calculation ===
                                'performance_based'
                                  ? 'Βάσει απόδοσης'
                                  : 'Βάσει προμήθειας'}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
