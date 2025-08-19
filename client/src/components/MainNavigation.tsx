import { StructuredNavigation } from './StructuredNavigation';

interface MainNavigationProps {
  collapsed?: boolean;
  isMobile?: boolean;
  isTablet?: boolean;
}

export function MainNavigation({ collapsed = false, isMobile = false, isTablet = false }: MainNavigationProps) {
  return <StructuredNavigation collapsed={collapsed} isMobile={isMobile} isTablet={isTablet} />;
}