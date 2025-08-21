import { useState, useEffect, useRef } from 'react';

interface TouchGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  threshold?: number;
}

export function useTouch(config: TouchGestureConfig) {
  const ref = useRef<HTMLElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const [lastTap, setLastTap] = useState<number>(0);
  
  const threshold = config.threshold || 50;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setTouchEnd(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      setTouchEnd({ x: touch.clientX, y: touch.clientY });
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;

      const deltaX = touchStart.x - touchEnd.x;
      const deltaY = touchStart.y - touchEnd.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Detect swipe gestures
      if (absX > threshold || absY > threshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            config.onSwipeLeft?.();
          } else {
            config.onSwipeRight?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            config.onSwipeUp?.();
          } else {
            config.onSwipeDown?.();
          }
        }
      } else {
        // Tap gesture
        const now = Date.now();
        const timeDiff = now - lastTap;
        
        if (timeDiff < 300 && timeDiff > 0) {
          // Double tap
          config.onDoubleTap?.();
          setLastTap(0);
        } else {
          // Single tap
          setTimeout(() => {
            if (Date.now() - now >= 300) {
              config.onTap?.();
            }
          }, 300);
          setLastTap(now);
        }
      }

      setTouchStart(null);
      setTouchEnd(null);
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, lastTap, threshold, config]);

  return ref;
}