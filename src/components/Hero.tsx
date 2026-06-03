'use client';

import dynamic from 'next/dynamic';
import { useScrollAnimation } from './butterfly/useScrollAnimation';

// Lazy-load the entire 3D bundle (three, drei, the scene) only on the client,
// after the page paints. A lightweight fallback keeps the hero meaningful while
// the WebGL canvas streams in.
const HeroButterfly3D = dynamic(() => import('./butterfly/HeroButterfly3D'), {
  ssr: false,
  loading: () => <ButterflyFallback />,
});

/** Soft golden glow shown before/instead of WebGL (no layout shift). */
function ButterflyFallback() {
  return (
    <div className="absolute inset-0 flex items-start justify-center pt-[14vh]">
      <div className="h-40 w-40 animate-shimmer rounded-full bg-[radial-gradient(circle,rgba(216,184,120,0.55)_0%,rgba(216,184,120,0)_70%)] blur-md" />
    </div>
  );
}

export function Hero() {
  const scroll = useScrollAnimation();

  return (
    <section className="relative flex h-[100svh] min-h-[640px] w-full flex-col items-center justify-center overflow-hidden">
      {/* 3D butterfly + golden light-dust, pinned over the hero */}
      <HeroButterfly3D scroll={scroll} />

      {/* Brand wordmark, echoing the logo's typography and gold rules */}
      <div className="pointer-events-none relative z-10 mt-[46vh] flex flex-col items-center px-6 text-center">
        <h1
          className="animate-fadeUp font-serif text-6xl font-bold tracking-[0.18em] text-ink sm:text-7xl md:text-8xl"
          style={{ animationDelay: '0.1s', opacity: 0 }}
        >
          MIND<span className="text-gold">É</span>A
        </h1>

        <div
          className="animate-fadeUp mt-4 flex items-center gap-4"
          style={{ animationDelay: '0.35s', opacity: 0 }}
        >
          <span className="h-px w-10 bg-gold/50" />
          <span className="font-sans text-[0.7rem] font-medium uppercase tracking-brand text-muted">
            Production
          </span>
          <span className="h-px w-10 bg-gold/50" />
        </div>

        <p
          className="animate-fadeUp mt-8 max-w-md font-sans text-base font-light leading-relaxed text-ink/70 md:text-lg"
          style={{ animationDelay: '0.6s', opacity: 0 }}
        >
          Licht. Identität. Transformation. <br />
          Eine ruhige, luxuriöse Markenwelt, getragen von einem goldenen
          Schmetterling.
        </p>
      </div>

      {/* Scroll cue */}
      <div
        className="animate-fadeUp absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
        style={{ animationDelay: '1s', opacity: 0 }}
      >
        <span className="font-sans text-[0.6rem] uppercase tracking-brand text-muted/70">
          Scrollen
        </span>
        <span className="h-10 w-px animate-shimmer bg-gradient-to-b from-gold/60 to-transparent" />
      </div>
    </section>
  );
}
