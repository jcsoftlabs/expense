'use client';

import { useEffect, useState, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 60 }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    // Only register touch events on mobile
    if (typeof window === 'undefined') return;

    function handleTouchStart(e: TouchEvent) {
      // Only pull to refresh if we are at the very top of the page
      if (window.scrollY > 5) return;
      
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isPulling) return;

      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      if (deltaY > 0 && window.scrollY <= 0) {
        // Apply resistance to the pull
        const resistanceDistance = Math.min(deltaY * 0.4, threshold * 1.5);
        setPullDistance(resistanceDistance);
        
        // Prevent scroll bounce when pulling
        if (e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    }

    function handleTouchEnd() {
      if (!isPulling) return;

      setIsPulling(false);
      
      if (pullDistance >= threshold && !isRefreshing) {
        triggerRefresh();
      } else {
        setPullDistance(0);
      }
    }

    async function triggerRefresh() {
      try {
        setIsRefreshing(true);
        setPullDistance(threshold); // Lock height to threshold during refresh
        await onRefresh();
      } catch (err) {
        console.error('Pull to refresh failed:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, isRefreshing, onRefresh, threshold]);

  return {
    pullDistance,
    isRefreshing,
    isPulling: pullDistance > 0
  };
}
