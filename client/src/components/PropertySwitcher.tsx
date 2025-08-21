// import { useProperty } from "@/contexts/PropertyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, Users } from "lucide-react";

export function PropertySwitcher() {
  // Temporary hardcoded values to prevent context errors
  const selectedProperty = { propertyId: "prop-princess", name: "Princess Resort & Spa", address: "Athens, Greece", costCenterCode: "CC001", location: "Athens", status: "active" as const };
  const properties = [
    { propertyId: "prop-princess", name: "Princess Resort & Spa", address: "Athens, Greece", costCenterCode: "CC001", location: "Athens", status: "active" as const },
    { propertyId: "prop-grand", name: "Grand Hotel Athens", address: "Athens, Greece", costCenterCode: "CC002", location: "Athens", status: "active" as const }
  ];
  const isGroupView = false;
  const setSelectedProperty = (property: any) => console.log("Property selected:", property);
  const setIsGroupView = (view: boolean) => console.log("Group view:", view);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Building2 className="w-4 h-4" />
          <span>
            {isGroupView ? "Group View" : selectedProperty?.name || "Select Property"}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => setIsGroupView(true)}
          className={isGroupView ? "bg-accent" : ""}
        >
          <Users className="w-4 h-4 mr-2" />
          <div className="flex flex-col">
            <span>Group View</span>
            <span className="text-xs text-muted-foreground">
              All Properties
            </span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {properties.map((property) => (
          <DropdownMenuItem
            key={property.propertyId}
            onClick={() => {
              setSelectedProperty(property);
              setIsGroupView(false);
            }}
            className={
              selectedProperty?.propertyId === property.propertyId && !isGroupView 
                ? "bg-accent" 
                : ""
            }
          >
            <Building2 className="w-4 h-4 mr-2" />
            <div className="flex flex-col flex-1">
              <span>{property.name}</span>
              <span className="text-xs text-muted-foreground">
                {property.location}
              </span>
            </div>
            {property.status === 'active' && (
              <Badge variant="outline" className="ml-2 text-xs">
                Active
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}