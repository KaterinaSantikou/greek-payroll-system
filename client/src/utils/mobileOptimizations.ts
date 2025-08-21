// Mobile optimization utilities for PayrollSync

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
}

export function getDeviceInfo(): DeviceInfo {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  return {
    isMobile: screenWidth < 768,
    isTablet: screenWidth >= 768 && screenWidth < 1280,
    isDesktop: screenWidth >= 1280,
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    screenWidth,
    screenHeight,
    devicePixelRatio,
    orientation: screenWidth > screenHeight ? 'landscape' : 'portrait'
  };
}

export function optimizeForMobile() {
  // Prevent zoom on iOS form inputs
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
    );
  }

  // Add touch-action optimizations
  document.body.style.touchAction = 'manipulation';

  // Optimize scrolling performance
  if ('scrollBehavior' in document.documentElement.style) {
    document.documentElement.style.scrollBehavior = 'smooth';
  }

  // Add momentum scrolling for iOS
  document.body.style.webkitOverflowScrolling = 'touch';
}

export function handleMobileKeyboard() {
  let initialViewportHeight = window.innerHeight;

  const handleViewportChange = () => {
    const currentHeight = window.innerHeight;
    const heightDifference = initialViewportHeight - currentHeight;
    
    // Keyboard is likely open if height decreased significantly
    if (heightDifference > 150) {
      document.body.classList.add('keyboard-open');
      // Scroll active input into view
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.tagName === 'INPUT') {
        setTimeout(() => {
          activeElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 300);
      }
    } else {
      document.body.classList.remove('keyboard-open');
    }
  };

  window.addEventListener('resize', handleViewportChange);
  return () => window.removeEventListener('resize', handleViewportChange);
}

export function addTouchFeedback() {
  // Add visual feedback for touch interactions
  const style = document.createElement('style');
  style.textContent = `
    .touch-feedback {
      position: relative;
      overflow: hidden;
    }
    
    .touch-feedback::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }
    
    .touch-feedback.active::after {
      width: 200px;
      height: 200px;
    }
    
    @media (prefers-reduced-motion: reduce) {
      .touch-feedback::after {
        transition: none;
      }
    }
  `;
  document.head.appendChild(style);

  // Add touch feedback to interactive elements
  document.addEventListener('touchstart', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.classList.contains('touch-feedback')) {
      target.classList.add('active');
      setTimeout(() => target.classList.remove('active'), 600);
    }
  });
}

export function optimizeImages() {
  // Lazy load images on mobile
  const images = document.querySelectorAll('img[data-src]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src!;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }
}

export function addPullToRefresh(onRefresh: () => Promise<void>) {
  let startY = 0;
  let currentY = 0;
  let isRefreshing = false;

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
      startY = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startY === 0 || isRefreshing) return;

    currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0 && window.scrollY === 0) {
      e.preventDefault();
      
      // Add visual indicator
      const indicator = document.getElementById('pull-to-refresh-indicator');
      if (indicator) {
        const opacity = Math.min(diff / 100, 1);
        indicator.style.opacity = opacity.toString();
        indicator.style.transform = `translateY(${Math.min(diff / 2, 50)}px)`;
      }
    }
  };

  const handleTouchEnd = async () => {
    if (startY === 0 || isRefreshing) return;

    const diff = currentY - startY;
    
    if (diff > 80) {
      isRefreshing = true;
      try {
        await onRefresh();
      } finally {
        isRefreshing = false;
      }
    }

    // Reset
    startY = 0;
    currentY = 0;
    
    const indicator = document.getElementById('pull-to-refresh-indicator');
    if (indicator) {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(0)';
    }
  };

  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);

  return () => {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };
}

export function addHapticFeedback() {
  // Add haptic feedback for supported devices
  const vibrate = (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return {
    light: () => vibrate(10),
    medium: () => vibrate(50),
    heavy: () => vibrate(100),
    success: () => vibrate([50, 100, 50]),
    error: () => vibrate([100, 50, 100, 50, 100]),
    warning: () => vibrate([50, 50, 50])
  };
}

// Initialize all mobile optimizations
export function initMobileOptimizations() {
  const deviceInfo = getDeviceInfo();
  
  if (deviceInfo.isMobile || deviceInfo.isTablet) {
    optimizeForMobile();
    handleMobileKeyboard();
    addTouchFeedback();
    optimizeImages();
  }

  return deviceInfo;
}