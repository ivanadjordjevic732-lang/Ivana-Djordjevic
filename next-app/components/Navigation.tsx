'use client';

import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { label: 'Studio', href: '#studio' },
  { label: 'Pakete', href: '#pakete' },
  { label: 'Founder', href: '#founder' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Kontakt', href: '#kontakt' },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-luxury ${
        scrolled
          ? 'border-b border-line bg-cream-soft/75 py-3 backdrop-blur-xl'
          : 'border-b border-transparent py-6'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-12">
        <a href="/" className="font-serif text-2xl tracking-[0.08em] text-ink">
          Mindéa
        </a>
        <ul className="hidden items-center gap-9 text-[11px] uppercase tracking-[0.28em] text-ink/65 lg:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="transition-colors duration-500 ease-luxury hover:text-gold"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#kontakt"
          className="hidden rounded-full border border-gold/45 px-6 py-3 text-[11px] uppercase tracking-[0.28em] text-ink transition-colors duration-500 ease-luxury hover:border-gold hover:text-gold lg:inline-flex"
        >
          Projekt anfragen
        </a>
      </div>
    </nav>
  );
}
