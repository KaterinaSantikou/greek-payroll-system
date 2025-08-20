import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { X, Menu } from "lucide-react";
import { MainNavigation } from "./MainNavigation";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ResponsiveSidebarProps {
  children?: React.ReactNode;
}

export function ResponsiveSidebar({ children }: ResponsiveSidebarProps) {
  const { t } = useLocale();
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

  const [isHovering, setIsHovering] = React.useState(false);

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

  // Mobile overlay
  const MobileOverlay = () => (
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
  );

  // Mobile menu button
  const MobileMenuButton = () => (
    isMobile && (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden"
      >
        {isExpanded ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
    )
  );

  return (
    <>
      <MobileOverlay />
      <MobileMenuButton />
      
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
        <div className="flex-1 overflow-y-auto py-4">
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
          "transition-all duration-300 flex-1 overflow-auto",
          {
            // Desktop: always account for sidebar
            "ml-70": isDesktop && shouldShowExpanded,
            // Desktop collapsed or tablet
            "ml-18": (isDesktop && !shouldShowExpanded && !isMobile) || (isTablet && !isMobile),
            // Mobile: no margin (sidebar is overlay)
            "ml-0": isMobile,
          }
        )}
      >
        {children}
      </main>
    </>
  );
}