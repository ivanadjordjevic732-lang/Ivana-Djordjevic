'use client';

import { useEffect, useRef } from 'react';

/**
 * Tracks the cursor as a normalised value in [-1, 1] for both axes,
 * relative to the viewport center. Updates are write-only on a ref so
 * consumers can poll without triggering React re-renders.
 */
export function useMouseNormalized() {
  const ref = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      ref.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      ref.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return ref;
}
