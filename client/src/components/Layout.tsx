import Sidebar from "./Sidebar";
import { PropertySwitcher } from "./PropertySwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { useProperty } from "@/contexts/PropertyContext";
import { motion } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { selectedPropertyId, setSelectedPropertyId, toggleGroupView, isGroupView } = useProperty();

  return (
    <div className="flex h-screen bg-background transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 overflow-auto">
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
                {isGroupView ? "Group Dashboard" : "Property Dashboard"}
              </motion.h1>
            </div>
            <div className="flex items-center space-x-3">
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