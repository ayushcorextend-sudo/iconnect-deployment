import { useEffect, useState } from 'react';

/**
 * useIsMobile — SSR-safe responsive hook.
 *
 * Detects mobile viewport via matchMedia (more efficient than resize listeners).
 * Debounced internally by the browser's matchMedia event.
 *
 * @param {number} breakpoint - max-width in pixels (default 768)
 * @returns {boolean} true when viewport ≤ breakpoint
 */
export default function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    // Modern API (Safari 14+, all modern browsers)
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    // Legacy fallback
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, [breakpoint]);

  return isMobile;
}

/**
 * useIsStandalone — detects whether the app is running as an installed PWA.
 * Returns true when launched from home screen (display-mode: standalone).
 */
export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari legacy
      window.navigator.standalone === true
    );
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = (e) => setIsStandalone(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  return isStandalone;
}
