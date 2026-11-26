import { useEffect, useState } from 'react';

import { AccessibilityInfo } from 'react-native';

/**
 * Native counterpart of the web `useReducedMotion`.
 *
 * The web implementation reads `window.matchMedia`. On native that global is
 * supplied by a partial shim whose MediaQueryList has no `addEventListener`,
 * so calling it throws. React Native exposes the same preference through
 * AccessibilityInfo, which is both safe and actually wired to the OS setting.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReduced(enabled);
      })
      .catch(() => {
        // ignore — leave motion enabled
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduced(enabled);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return reduced;
}
