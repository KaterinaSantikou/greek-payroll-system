import React, { createContext, useContext, useState, ReactNode } from "react";

interface Property {
  propertyId: string;
  name: string;
}

interface PropertyContextValue {
  currentProperty: Property;
  setCurrentProperty: (property: Property) => void;
  properties: Property[];
}

const PropertyContext = createContext<PropertyContextValue | undefined>(undefined);

export function useProperty() {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error("useProperty must be used within a PropertyProvider");
  }
  return context;
}

interface PropertyProviderProps {
  children: ReactNode;
}

export function PropertyProvider({ children }: PropertyProviderProps) {
  const [currentProperty, setCurrentProperty] = useState<Property>({
    propertyId: "prop-princess",
    name: "Princess Resort & Spa"
  });

  const properties: Property[] = [
    { propertyId: "prop-princess", name: "Princess Resort & Spa" },
    { propertyId: "prop-grand", name: "Grand Hotel Athens" },
    { propertyId: "prop-seaside", name: "Seaside Resort" }
  ];

  const value: PropertyContextValue = {
    currentProperty,
    setCurrentProperty,
    properties
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
}