import { useEffect, useRef, useCallback } from 'react';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Automatically logs out the user after 30 minutes of inactivity.
 * Activity is defined as: mousemove, keydown, click, scroll, touchstart.
 */
export function useInactivityLogout(logout, navigate) {
  const timerRef = useRef(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!logout) return;

    timerRef.current = setTimeout(async () => {
      try {
        await logout();
      } catch {}
      navigate('/login?reason=inactivity');
    }, INACTIVITY_TIMEOUT_MS);
  }, [logout, navigate]);

  useEffect(() => {
    if (!logout) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start timer on mount

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [logout, resetTimer]);
}
