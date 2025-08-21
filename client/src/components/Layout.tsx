import { MainNavigation } from "./MainNavigation";
import { PropertySwitcher } from "./PropertySwitcher";
import LanguageSwitcher from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPaletteButton } from "./CommandPaletteButton";
import { SupportChatWidget } from "./SupportChat";
import { useCommandPalette } from "@/hooks/useCommandPalette";
// import { useProperty } from "@/contexts/PropertyContext";
import { useAuth } from "@/hooks/useAuth";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useLocale } from "@/hooks/useLocale";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

function LayoutContent({ children }: LayoutProps) {
  const { setOpen } = useCommandPalette();
  const { t } = useLocale();
  
  // Use hardcoded property for now to avoid context issues
  const currentProperty = { propertyId: "prop-princess", name: "Princess Resort & Spa" };
  
  const {
    isExpanded,
    isCollapsed,
    isHidden,
    toggleSidebar,
    setSidebarState,
    isMobile,
    isTablet,
    isDesktop
  } = useSidebarState();

  const [isHovering, setIsHovering] = useState(false);

  // Handle tablet hover behavior
  const handleMouseEnter = () => {
    if (isTablet && isCollapsed) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (isTablet && isHovering) {
      setIsHovering(false);
    }
  };

  // Determine actual display state
  const shouldShowExpanded = isExpanded || (isTablet && isHovering);
  const shouldShowOverlay = isMobile && isExpanded;

  // Get sidebar width classes
  const getSidebarWidth = () => {
    if (isMobile) {
      return isExpanded ? 'w-80' : 'w-0';
    }
    if (shouldShowExpanded) {
      return 'w-70'; // 280px equivalent
    }
    return 'w-18'; // 72px equivalent for collapsed rail
  };

  return (
    <div className="h-screen bg-background transition-colors duration-300">
      {/* Mobile overlay */}
      <AnimatePresence>
        {shouldShowOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarState('hidden')}
          />
        )}
      </AnimatePresence>

      {/* Mobile menu button */}
      {isMobile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 lg:hidden touch-target"
        >
          {isExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Pull to refresh indicator */}
      <div 
        id="pull-to-refresh-indicator"
        className="fixed top-0 left-1/2 transform -translate-x-1/2 z-30 opacity-0 transition-all duration-300"
      >
        <div className="bg-background border border-border rounded-full p-2 shadow-lg">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      
      {/* Sidebar */}
      <motion.aside
        className={cn(
          "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col fixed left-0 top-0 h-screen",
          getSidebarWidth(),
          {
            // Z-index based on device
            "z-30": isDesktop || isTablet,
            "z-50": isMobile,
            // Transform based on state
            "translate-x-0": !isMobile || isExpanded,
            "-translate-x-full": isMobile && isHidden,
          }
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{
          width: isMobile ? (isExpanded ? 320 : 0) : (shouldShowExpanded ? 280 : 72)
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            {shouldShowExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-lg font-bold text-blue-600">{t('app.name')}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('app.tagline')}</p>
              </motion.div>
            )}
            
            {/* Toggle button - hidden on mobile as we have the floating button */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className={cn("p-1", {
                  "ml-auto": !shouldShowExpanded
                })}
              >
                {shouldShowExpanded ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <MainNavigation 
            collapsed={!shouldShowExpanded}
            isMobile={isMobile}
            isTablet={isTablet}
          />
        </div>

        {/* Footer - only show when expanded */}
        {shouldShowExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-t border-gray-200 dark:border-gray-800"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>{t('app.version')}</p>
              <p>{t('app.copyright')}</p>
            </div>
          </motion.div>
        )}
      </motion.aside>

      {/* Main content area with responsive margin */}
      <main 
        className={cn(
          "transition-all duration-300",
          {
            // Desktop: always account for sidebar
            "ml-70": isDesktop && shouldShowExpanded,
            "ml-18": (isDesktop && !shouldShowExpanded) || isTablet,
            // Mobile: no margin (sidebar is overlay)
            "ml-0": isMobile,
          }
        )}
      >
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
              <LanguageSwitcher />
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
          className="flex-1 overflow-auto"
        >
          {children}
        </motion.div>
      </main>

      {/* Support Chat Widget */}
      <SupportChatWidget />
    </div>
  );
}

export default function Layout({ children }: LayoutProps) {
  return <LayoutContent>{children}</LayoutContent>;
}
