import { ImprovedSidebar } from "./ImprovedSidebar";
import { ContextAwareBanner } from "./ContextAwareBanner";
import { PropertySwitcher } from "./PropertySwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPaletteButton } from "./CommandPaletteButton";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useProperty } from "@/contexts/PropertyContext";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { selectedPropertyId, setSelectedPropertyId, toggleGroupView, isGroupView } = useProperty();
  const { user } = useAuth();
  const { setOpen } = useCommandPalette();
  
  // Try to use app context, but provide fallback
  let currentProperty, contextBanner;
  try {
    const { currentProperty: appProperty } = useAppContext();
    currentProperty = appProperty;
    contextBanner = <ContextAwareBanner />;
  } catch {
    currentProperty = { propertyId: "prop-princess", name: "Princess Resort & Spa" };
    contextBanner = null;
  }

  return (
    <div className="flex h-screen bg-background transition-colors duration-300">
      <ImprovedSidebar 
        currentProperty={currentProperty}
        userRole={user?.firstName || "User"}
        onPropertyChange={setSelectedPropertyId}
      />
      <main className="flex-1 overflow-auto">
        {/* Context Banner */}
        {contextBanner}
        
        {/* Top Bar with Property Switcher */}
        <motion.div 
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-background border-b px-6 py-4 sticky top-0 z-10 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.h1 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="text-lg font-semibold text-foreground"
              >
                {isGroupView ? "Group Dashboard" : currentProperty.name}
              </motion.h1>
            </div>
            <div className="flex items-center space-x-3">
              <CommandPaletteButton onClick={() => setOpen(true)} />
              <PropertySwitcher />
              <ThemeToggle />
            </div>
          </div>
        </motion.div>
        
        {/* Main Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="p-8"
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