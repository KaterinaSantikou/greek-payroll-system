import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Globe, 
  MapPin,
  Users,
  BarChart3,
  Settings
} from "lucide-react";

interface Property {
  propertyId: string;
  name: string;
  address: string;
  costCenterCode: string;
  employeeCount?: number;
  status?: 'active' | 'inactive';
}

interface PropertySwitcherProps {
  selectedPropertyId: string;
  onPropertyChange: (propertyId: string) => void;
  showGroupView?: boolean;
  onToggleGroupView?: () => void;
}

export function PropertySwitcher({ 
  selectedPropertyId, 
  onPropertyChange, 
  showGroupView = false,
  onToggleGroupView 
}: PropertySwitcherProps) {
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: propertyStats } = useQuery<{
    activeEmployees: number;
    monthlyLabourCost: number;
  }>({
    queryKey: ["/api/properties/stats", selectedPropertyId],
    enabled: selectedPropertyId !== 'group'
  });

  const selectedProperty = properties.find((p: Property) => p.propertyId === selectedPropertyId);

  const switchPropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest(`/api/user/property-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ propertyId })
      });
    },
    onSuccess: () => {
      // Invalidate all property-scoped data
      queryClient.invalidateQueries({ queryKey: ["/api"] });
    }
  });

  const handlePropertyChange = (propertyId: string) => {
    onPropertyChange(propertyId);
    if (propertyId !== 'group') {
      switchPropertyMutation.mutate(propertyId);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Property Selector */}
      <div className="flex items-center space-x-2">
        <Building2 className="w-4 h-4 text-muted-foreground" />
        <Select
          value={selectedPropertyId}
          onValueChange={handlePropertyChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select property..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="group">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span className="font-semibold">Group View</span>
              </div>
            </SelectItem>
            <div className="border-t my-1" />
            {properties.map((property) => (
              <SelectItem key={property.propertyId} value={property.propertyId}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <div>
                      <div className="font-medium">{property.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {property.costCenterCode}
                      </div>
                    </div>
                  </div>
                  {property.employeeCount && (
                    <Badge variant="outline" className="ml-2">
                      <Users className="w-3 h-3 mr-1" />
                      {property.employeeCount}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property Info & Stats */}
      {selectedPropertyId !== 'group' && selectedProperty && (
        <div className="hidden lg:flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>{selectedProperty.address?.split(',')[0]}</span>
          </div>
          {propertyStats && (
            <>
              <div className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>{propertyStats.activeEmployees} employees</span>
              </div>
              <div className="flex items-center space-x-1">
                <BarChart3 className="w-3 h-3" />
                <span>€{propertyStats.monthlyLabourCost?.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Group View Toggle */}
      {showGroupView && onToggleGroupView && (
        <Button
          variant={selectedPropertyId === 'group' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            if (selectedPropertyId === 'group') {
              // Switch to first available property
              const firstProperty = properties[0];
              if (firstProperty) {
                handlePropertyChange(firstProperty.propertyId);
              }
            } else {
              handlePropertyChange('group');
            }
            onToggleGroupView();
          }}
          className="flex items-center space-x-1"
        >
          <Globe className="w-4 h-4" />
          <span>{selectedPropertyId === 'group' ? 'Property View' : 'Group View'}</span>
        </Button>
      )}
    </div>
  );
}