import { useProperty } from "@/contexts/PropertyContext";
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
  const { 
    selectedProperty, 
    setSelectedProperty, 
    properties, 
    isGroupView, 
    setIsGroupView 
  } = useProperty();

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