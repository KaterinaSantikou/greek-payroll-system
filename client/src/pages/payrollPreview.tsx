/**
 * Payroll Preview Page - Manager view for offline payroll preview
 */

import { OfflinePayrollPreview } from '@/components/OfflinePayrollPreview';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Building2 } from 'lucide-react';
import { format, startOfMonth, subMonths } from 'date-fns';

export default function PayrollPreview() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState(
    format(new Date(), 'yyyy-MM')
  );
  const [selectedProperty, setSelectedProperty] = useState<string>('');

  // Get user's properties
  const { data: properties } = useQuery({
    queryKey: ['/api/properties'],
    enabled: !!user?.id,
  });

  // Get user profile for default property
  const { data: userProfile } = useQuery<{
    id: string;
    defaultPropertyId?: string;
  }>({
    queryKey: ['/api/user/profile'],
    enabled: !!user?.id,
  });

  // Set default property when profile loads
  useEffect(() => {
    if (userProfile?.defaultPropertyId && !selectedProperty) {
      setSelectedProperty(userProfile.defaultPropertyId);
    }
  }, [userProfile?.defaultPropertyId, selectedProperty]);

  // Generate period options (current month and 3 months back)
  const periodOptions = Array.from({ length: 4 }, (_, i) => {
    const date = subMonths(new Date(), i);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'MMMM yyyy');
    return { value, label };
  });

  // Use default property if none selected
  const propertyId =
    selectedProperty ||
    userProfile?.defaultPropertyId ||
    properties?.[0]?.propertyId ||
    'prop-princess';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Period and Property Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Payroll Preview Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pay Period Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Pay Period</label>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pay period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Property Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Property</label>
                <Select
                  value={selectedProperty}
                  onValueChange={setSelectedProperty}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.map((property: any) => (
                      <SelectItem
                        key={property.propertyId}
                        value={property.propertyId}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {property.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Preview Component */}
        <OfflinePayrollPreview
          payPeriod={selectedPeriod}
          propertyId={propertyId}
        />
      </div>
    </div>
  );
}
