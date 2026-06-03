'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** Reusable section heading with the brand's twin gold rules. */
function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-12 flex flex-col items-center text-center">
      <span className="font-sans text-[0.7rem] font-semibold uppercase tracking-brand text-gold">
        {kicker}
      </span>
      <h2 className="mt-4 font-serif text-3xl font-semibold tracking-wide text-ink md:text-5xl">
        {title}
      </h2>
      <div className="mt-6 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
    </div>
  );
}

const PILLARS = [
  {
    title: 'Licht',
    text: 'Jede Marke trägt ein eigenes Leuchten. Wir machen es sichtbar – warm, klar und unverwechselbar.',
  },
  {
    title: 'Identität',
    text: 'Aus Werten, Stimme und Ästhetik formen wir eine Identität, die ruhig wirkt und lange trägt.',
  },
  {
    title: 'Transformation',
    text: 'Wie der Schmetterling begleiten wir Wandel – behutsam, hochwertig und mit Sinn für das Echte.',
  },
];

export function Sections() {
  const root = useRef<HTMLDivElement>(null);

  // Gentle fade-up reveals as each block enters the viewport.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 1.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 82%' },
          }
        );
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative z-10">
      {/* Philosophy */}
      <section className="mx-auto max-w-5xl px-6 py-28 md:py-36">
        <div data-reveal>
          <SectionTitle kicker="Mindéa Philosophie" title="Schönheit, die ruht" />
          <p className="mx-auto max-w-2xl text-center font-sans text-lg font-light leading-relaxed text-ink/75">
            Mindéa steht für eine feminine, luxuriöse Markenwelt, in der weniger
            wirklich mehr ist. Kein Lärm, keine Hektik – nur Klarheit, Wärme und
            ein goldener Schimmer, der in Erinnerung bleibt.
          </p>
        </div>
      </section>

      {/* Three pillars */}
      <section className="mx-auto max-w-6xl px-6 pb-28 md:pb-36">
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <article
              key={p.title}
              data-reveal
              className="group rounded-3xl border border-gold/20 bg-cream-50/70 p-8 shadow-[0_10px_40px_rgba(139,100,50,0.08)] backdrop-blur-sm transition-transform duration-500 hover:-translate-y-1"
            >
              <span className="font-serif text-5xl font-bold text-gold/30">
                0{i + 1}
              </span>
              <h3 className="mt-4 font-serif text-2xl font-semibold text-ink">
                {p.title}
              </h3>
              <p className="mt-3 font-sans text-base font-light leading-relaxed text-ink/70">
                {p.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Quote / statement */}
      <section className="mx-auto max-w-4xl px-6 py-28 text-center md:py-40">
        <div data-reveal>
          <div className="mx-auto mb-10 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <blockquote className="font-serif text-3xl font-medium italic leading-snug text-ink md:text-4xl">
            „Wahre Eleganz flüstert –
            <br />
            sie schreit nie.“
          </blockquote>
          <div className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-36 pt-12 text-center">
        <div data-reveal>
          <SectionTitle kicker="Kontakt" title="Lass uns leuchten" />
          <p className="mx-auto mb-10 max-w-xl font-sans text-lg font-light leading-relaxed text-ink/75">
            Bereit, deiner Marke ein goldenes Licht zu geben? Schreib uns – wir
            antworten ruhig, persönlich und mit Sinn fürs Detail.
          </p>
          <a
            href="mailto:hello@mindea.production"
            className="pointer-events-auto inline-flex items-center justify-center rounded-full bg-gradient-to-r from-gold-deep to-gold px-10 py-4 font-sans text-sm font-semibold uppercase tracking-brand text-cream-50 shadow-[0_10px_30px_rgba(139,100,50,0.25)] transition-all duration-300 hover:shadow-[0_14px_40px_rgba(139,100,50,0.35)]"
          >
            Anfrage senden
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gold/15 py-10 text-center">
        <p className="font-serif text-lg font-semibold tracking-[0.2em] text-ink">
          MIND<span className="text-gold">É</span>A
        </p>
        <p className="mt-2 font-sans text-[0.7rem] uppercase tracking-brand text-muted/70">
          Production · © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
