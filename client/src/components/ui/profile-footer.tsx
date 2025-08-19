import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/contexts/AppContext";
import { Badge } from "./badge";
import { Button } from "./button";
import { Separator } from "./separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./dropdown-menu";
import {
  User,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Building2,
  Globe,
  CheckCircle
} from "lucide-react";

interface ProfileFooterProps {
  currentProperty: {
    name: string;
    propertyId: string;
  };
  userRole: string;
}

export function ProfileFooter({ currentProperty, userRole }: ProfileFooterProps) {
  const { user } = useAuth();
  const { setCurrentProperty } = useAppContext();
  
  const properties = [
    { propertyId: "prop-princess", name: "Princess Resort & Spa" },
    { propertyId: "prop-apollo", name: "Apollo Beach Hotel" },
    { propertyId: "prop-athena", name: "Athena Palace" },
  ];

  const departments = [
    "Front Office", "Housekeeping", "F&B Service", 
    "Kitchen", "Maintenance", "Administration"
  ];

  const isManager = userRole?.toLowerCase().includes("manager") || 
                  user?.email?.includes("manager");

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
      {/* Property Context */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Ενεργό Ακίνητο</span>
          <Badge variant="outline" className="text-xs">
            {userRole}
          </Badge>
        </div>
        <div className="font-medium text-sm text-foreground">
          {currentProperty.name}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {currentProperty.propertyId}
        </div>
      </div>

      {/* Quick Department Switch for Managers */}
      {isManager && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Γρήγορη Αλλαγή Τμήματος</span>
          <div className="grid grid-cols-2 gap-1">
            {departments.slice(0, 4).map((dept) => (
              <Button
                key={dept}
                variant="ghost"
                size="sm"
                className="text-xs h-7 justify-start"
              >
                {dept}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      <Separator />
      
      {/* Account Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-auto p-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.email}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Λογαριασμός Χρήστη</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Προφίλ</span>
          </DropdownMenuItem>
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Globe className="mr-2 h-4 w-4" />
              <span>Γλώσσα</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>
                <CheckCircle className="mr-2 h-4 w-4" />
                Ελληνικά
              </DropdownMenuItem>
              <DropdownMenuItem>
                English
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          <DropdownMenuItem>
            <Bell className="mr-2 h-4 w-4" />
            <span>Ειδοποιήσεις</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Ρυθμίσεις</span>
          </DropdownMenuItem>
          
          {isManager && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Αλλαγή Ακινήτου</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {properties.map((property) => (
                    <DropdownMenuItem 
                      key={property.propertyId}
                      onClick={() => setCurrentProperty(property)}
                      className={currentProperty.propertyId === property.propertyId ? "bg-accent" : ""}
                    >
                      {currentProperty.propertyId === property.propertyId && (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      <span className={currentProperty.propertyId !== property.propertyId ? "ml-6" : ""}>
                        {property.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/api/logout" className="flex items-center">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Αποσύνδεση</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Compliance Status */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Συμμόρφωση Ελλάδας</span>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>Ενεργό</span>
        </div>
      </div>
    </div>
  );
}