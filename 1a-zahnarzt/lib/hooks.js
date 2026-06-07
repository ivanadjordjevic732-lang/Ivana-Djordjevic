'use client';
import { useEffect, useState } from 'react';

// Respektiert die Systemeinstellung "Bewegung reduzieren".
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

// Grobe Geräteklasse für Performance-Entscheidungen.
// 'low' = schwaches Gerät -> leichtere Variante.
export function useDeviceTier() {
  const [tier, setTier] = useState('high');
  useEffect(() => {
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let t = 'high';
    if (cores <= 4 || mem <= 4) t = 'mid';
    if (cores <= 2 || mem <= 2) t = 'low';
    // Auf Touch-Geräten eine Stufe vorsichtiger sein.
    if (coarse && t === 'high') t = 'mid';
    setTier(t);
  }, []);
  return tier;
}

export function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);
  }, []);
  return touch;
}
