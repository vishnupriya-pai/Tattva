import { useEffect } from 'react';

/**
 * Mirrors Research Mode state onto `<html data-mode="research">` so
 * globals.css can apply the uiRefactor.md §7.1 high-contrast overrides.
 * Business logic and the 3x stamina multiplier stay wherever they already
 * live server-side; this only drives the visual shift.
 */
export function useResearchModeAttribute(researchMode: boolean) {
  useEffect(() => {
    if (researchMode) {
      document.documentElement.dataset.mode = 'research';
    } else {
      delete document.documentElement.dataset.mode;
    }
    return () => {
      delete document.documentElement.dataset.mode;
    };
  }, [researchMode]);
}
