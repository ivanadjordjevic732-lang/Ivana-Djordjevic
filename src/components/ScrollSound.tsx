'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A calm, synthesized chime tied to scroll/swipe velocity (Web Audio API – no
 * audio assets, no network). Soft pentatonic bells with a slow attack/release
 * and a warm low-pass. Audio only starts after the first user gesture (browser
 * policy); a discrete toggle lets visitors mute it.
 */
const SCALE = [392.0, 440.0, 523.25, 587.33, 659.25, 783.99]; // G A C D E G

export function ScrollSound() {
  const [on, setOn] = useState(true);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const startedRef = useRef(false);
  const onRef = useRef(on);
  const lastNote = useRef(0);
  const lastIdx = useRef(-1);

  onRef.current = on;

  const ensure = useCallback(() => {
    if (ctxRef.current) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.Q.value = 0.4;
    master.connect(lp);
    lp.connect(ctx.destination);
    master.gain.exponentialRampToValueAtTime(
      onRef.current ? 0.85 : 0.0001,
      ctx.currentTime + 1.0
    );
    ctxRef.current = ctx;
    masterRef.current = master;
  }, []);

  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    ensure();
    if (ctxRef.current?.state === 'suspended') void ctxRef.current.resume();
  }, [ensure]);

  const note = useCallback((intensity: number) => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master || !onRef.current) return;
    const now = ctx.currentTime;
    if (now - lastNote.current < 0.16) return; // throttle → calm, never hectic
    lastNote.current = now;

    let idx: number;
    do {
      idx = Math.floor(Math.random() * SCALE.length);
    } while (idx === lastIdx.current && SCALE.length > 1);
    lastIdx.current = idx;
    const f = SCALE[idx];

    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 2.003; // octave shimmer
    const g = ctx.createGain();
    const g2 = ctx.createGain();
    g2.gain.value = 0.28;
    const peak = Math.min(0.16, 0.05 + intensity * 0.05);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);

    o1.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(master);
    o1.start(now);
    o2.start(now);
    o1.stop(now + 1.8);
    o2.stop(now + 1.8);
  }, []);

  // Unlock audio on first gesture + react to scroll/swipe velocity.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlock = () => start();
    const events: (keyof WindowEventMap)[] = [
      'pointerdown',
      'touchstart',
      'keydown',
      'wheel',
    ];
    events.forEach((e) =>
      window.addEventListener(e, unlock, { once: true, passive: true })
    );

    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const y = window.scrollY;
      const t = performance.now();
      const dt = Math.max(16, t - lastT);
      const v = Math.abs(y - lastY) / dt; // px per ms
      lastY = y;
      lastT = t;
      if (v > 0.12) note(Math.min(1, v));
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      events.forEach((e) => window.removeEventListener(e, unlock));
      window.removeEventListener('scroll', onScroll);
    };
  }, [start, note]);

  const toggle = () => {
    start();
    const next = !on;
    setOn(next);
    onRef.current = next;
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (ctx && master) {
      master.gain.exponentialRampToValueAtTime(
        next ? 0.85 : 0.0001,
        ctx.currentTime + 0.3
      );
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Ton an/aus"
      aria-pressed={on}
      className={`fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-cream-50/80 shadow-[0_6px_20px_rgba(139,100,50,0.15)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(139,100,50,0.22)] ${
        on ? 'text-gold-deep' : 'text-muted/50'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[22px] w-[22px]"
      >
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        {on ? (
          <>
            <path d="M16.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 6a8.5 8.5 0 0 1 0 12" />
          </>
        ) : (
          <line x1="3" y1="21" x2="21" y2="3" />
        )}
      </svg>
    </button>
  );
}
