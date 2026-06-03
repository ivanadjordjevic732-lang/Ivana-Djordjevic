'use client';

import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { Butterfly3D, type ButterflyHandle } from './Butterfly3D';
import { ParticleTrail } from './ParticleTrail';
import { useMouseNormalized } from '@/lib/useMouseNormalized';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  // Line-mask reveal on mount
  useEffect(() => {
    if (!headlineRef.current) return;
    const lines = headlineRef.current.querySelectorAll<HTMLElement>('[data-line]');
    gsap.fromTo(
      lines,
      { yPercent: 110 },
      {
        yPercent: 0,
        duration: 1.4,
        ease: 'expo.out',
        stagger: 0.18,
        delay: 0.3,
      },
    );
  }, []);

  return (
    <section
      ref={sectionRef}
      id="studio"
      className="relative isolate flex min-h-screen items-center overflow-hidden bg-cream pt-36"
    >
      {/* Soft cream radial wash so the canvas blends with the page */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,#FBF6EC_0%,#EFE5D2_55%,#E5DAC3_100%)]" />

      {/* 3D Canvas — fills the hero, contains the butterfly + particles */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <HeroCanvas section={sectionRef} />
        </Suspense>
      </div>

      {/* Foreground content */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-end gap-12 px-6 pb-32 lg:grid-cols-[1.4fr_1fr] lg:px-12">
        <div>
          <p className="mb-8 inline-flex items-center gap-4 text-[10px] uppercase tracking-[0.4em] text-gold-dark">
            <span className="block h-px w-9 bg-gold-dark" />
            Cinematic Brand Studio · Salzgitter
          </p>
          <h1
            ref={headlineRef}
            className="font-serif text-[clamp(46px,8.6vw,148px)] font-extralight leading-[0.95] tracking-tight text-ink"
          >
            <span className="block overflow-hidden">
              <span data-line className="block">
                Marken, die man
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-line className="block">
                nicht nur sieht.
              </span>
            </span>
            <span className="block overflow-hidden">
              <span data-line className="block italic text-gold-dark">
                Sondern fühlt.
              </span>
            </span>
          </h1>
        </div>
        <div className="lg:pb-2 lg:pl-8">
          <p className="max-w-md text-[17px] leading-[1.78] text-ink/70">
            Mindéa verwandelt deine Bilder, deine Stimme und deine Geschichte
            in cineastische Brand Videos, die Vertrauen schaffen, bevor du ein
            Wort erklärst.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <a
              href="#pakete"
              className="group inline-flex items-center gap-3.5 rounded-full border border-gold-dark/55 px-8 py-4 text-[11px] uppercase tracking-[0.32em] text-ink transition-all duration-500 ease-luxury hover:-translate-y-0.5 hover:border-gold"
            >
              <span>Pakete &amp; Preise</span>
              <Arrow />
            </a>
            <a
              href="#kontakt"
              className="group inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.32em] text-ink/70 transition-colors duration-500 ease-luxury hover:text-gold"
            >
              Erstgespräch buchen{' '}
              <span className="inline-block transition-transform duration-500 ease-luxury group-hover:translate-x-1.5">
                →
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <span className="relative inline-block h-px w-4 bg-current transition-[width] duration-500 ease-luxury group-hover:w-6">
      <span className="absolute -top-[3px] right-0 h-1.5 w-1.5 rotate-45 border-r border-t border-current" />
    </span>
  );
}

function HeroCanvas({ section }: { section: React.RefObject<HTMLElement> }) {
  const butterflyRef = useRef<ButterflyHandle>(null);
  const mouse = useMouseNormalized();

  // Scroll choreography — butterfly drifts up & forward, opacity dims slightly
  useEffect(() => {
    if (!section.current) return;
    const trig = ScrollTrigger.create({
      trigger: section.current,
      start: 'top top',
      end: 'bottom top',
      scrub: 1.6,
      onUpdate: (self) => {
        butterflyRef.current?.setScrollProgress(self.progress);
      },
    });
    return () => {
      trig.kill();
    };
  }, [section]);

  return (
    <Canvas
      camera={{ position: [0, 0.4, 8], fov: 38 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <Environment preset="apartment" />
      </Suspense>
      <ambientLight intensity={0.6} color={0xfff4dd} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} color={0xfff0c8} />
      <pointLight position={[-3, 2, 3]} intensity={0.7} color={0xc8a96a} />

      <Butterfly3D ref={butterflyRef} mouse={mouse} />
      <ParticleTrail sourceRef={butterflyRef} />
    </Canvas>
  );
}
