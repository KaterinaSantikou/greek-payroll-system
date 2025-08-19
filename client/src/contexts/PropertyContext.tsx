import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Property {
  propertyId: string;
  name: string;
  address: string;
  costCenterCode: string;
  employeeCount?: number;
  status?: 'active' | 'inactive';
}

interface PropertyContextType {
  selectedPropertyId: string;
  selectedProperty: Property | null;
  properties: Property[];
  isGroupView: boolean;
  setSelectedPropertyId: (propertyId: string) => void;
  toggleGroupView: () => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

interface PropertyProviderProps {
  children: ReactNode;
}

export function PropertyProvider({ children }: PropertyProviderProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('group');
  const [isGroupView, setIsGroupView] = useState(true);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Load user's last selected property from localStorage
  useEffect(() => {
    const savedPropertyId = localStorage.getItem('selectedPropertyId');
    if (savedPropertyId && savedPropertyId !== 'group') {
      setSelectedPropertyId(savedPropertyId);
      setIsGroupView(false);
    } else if (properties.length > 0 && selectedPropertyId === 'group') {
      // Default to first property if we have properties loaded
      setSelectedPropertyId(properties[0]?.propertyId || 'group');
      setIsGroupView(false);
    }
  }, [properties]);

  // Save property selection to localStorage
  useEffect(() => {
    if (selectedPropertyId !== 'group') {
      localStorage.setItem('selectedPropertyId', selectedPropertyId);
    }
  }, [selectedPropertyId]);

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setIsGroupView(propertyId === 'group');
  };

  const toggleGroupView = () => {
    if (isGroupView) {
      // Switch to first property
      const firstProperty = properties[0];
      if (firstProperty) {
        handlePropertyChange(firstProperty.propertyId);
      }
    } else {
      handlePropertyChange('group');
    }
  };

  const selectedProperty = properties.find((p: Property) => p.propertyId === selectedPropertyId) || null;

  const value: PropertyContextType = {
    selectedPropertyId,
    selectedProperty,
    properties,
    isGroupView,
    setSelectedPropertyId: handlePropertyChange,
    toggleGroupView,
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
}

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
}