import { useState, useEffect } from 'react';

export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

interface SidebarStateHook {
  isExpanded: boolean;
  isCollapsed: boolean;
  isHidden: boolean;
  toggleSidebar: () => void;
  setSidebarState: (state: SidebarState) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useSidebarState(): SidebarStateHook {
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded');
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Detect screen size changes
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1280) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`sidebar-state-${screenSize}`);
    if (savedState && ['expanded', 'collapsed', 'hidden'].includes(savedState)) {
      setSidebarState(savedState as SidebarState);
    } else {
      // Set default states based on screen size
      if (screenSize === 'mobile') {
        setSidebarState('hidden');
      } else if (screenSize === 'tablet') {
        setSidebarState('collapsed');
      } else {
        setSidebarState('expanded');
      }
    }
  }, [screenSize]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(`sidebar-state-${screenSize}`, sidebarState);
  }, [sidebarState, screenSize]);

  const toggleSidebar = () => {
    if (screenSize === 'mobile') {
      setSidebarState(sidebarState === 'hidden' ? 'expanded' : 'hidden');
    } else {
      setSidebarState(sidebarState === 'expanded' ? 'collapsed' : 'expanded');
    }
  };

  return {
    isExpanded: sidebarState === 'expanded',
    isCollapsed: sidebarState === 'collapsed',
    isHidden: sidebarState === 'hidden',
    toggleSidebar,
    setSidebarState,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
  };
}