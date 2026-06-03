'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export interface ScrollState {
  /** Normalised page scroll progress, 0 (top) → 1 (bottom). */
  progress: number;
  /** Smoothed scroll velocity, useful for trail emission. */
  velocity: number;
}

/**
 * Sets up a single GSAP ScrollTrigger over the whole document and writes a
 * smoothed scroll progress + velocity into a ref. The 3D scene reads this ref
 * inside its render loop, so React never re-renders on scroll (60 FPS friendly).
 *
 * Returns a stable ref – pass it down to the Canvas scene.
 */
export function useScrollAnimation(): MutableRefObject<ScrollState> {
  const state = useRef<ScrollState>({ progress: 0, velocity: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        state.current.progress = self.progress;
        state.current.velocity = self.getVelocity() / 1000;
      },
    });

    // Recompute on resize / font load so the mapping stays accurate.
    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      trigger.kill();
    };
  }, []);

  return state;
}
