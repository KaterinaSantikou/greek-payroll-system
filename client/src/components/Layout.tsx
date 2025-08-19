import { MainNavigation } from "./MainNavigation";
import { PropertySwitcher } from "./PropertySwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPaletteButton } from "./CommandPaletteButton";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useProperty } from "@/contexts/PropertyContext";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { selectedPropertyId, setSelectedPropertyId } = useProperty();
  const { user } = useAuth();
  const { setOpen } = useCommandPalette();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const currentProperty = { propertyId: "prop-princess", name: "Princess Resort & Spa" };

  return (
    <div className="flex h-screen bg-background transition-colors duration-300">
      {/* Sidebar */}
      <aside className={`${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-blue-600">PayrollSync</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Greek HR & Payroll</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <MainNavigation collapsed={sidebarCollapsed} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 py-4 sticky top-0 z-10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.h1 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {currentProperty.name}
              </motion.h1>
            </div>
            <div className="flex items-center space-x-3">
              <CommandPaletteButton onClick={() => setOpen(true)} />
              <PropertySwitcher />
              <ThemeToggle />
            </div>
          </div>
        </motion.div>
        
        {/* Page Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex-1"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  return <LayoutContent>{children}</LayoutContent>;
}