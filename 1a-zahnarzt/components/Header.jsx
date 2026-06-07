'use client';
import { useEffect, useState } from 'react';

const ToothMark = () => (
  <svg className="mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5.5c-2-2-5.5-2-7 .5-1.4 2.4-.3 6 1 9 .7 1.7 1.2 3.5 2 3.5s1-2 2-2 1.2 2 2 2 1.3-1.8 2-3.5c1.3-3 2.4-6.6 1-9-1.5-2.5-5-2.5-7-.5Z" />
  </svg>
);

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`header${scrolled ? ' scrolled' : ''}`}>
      <div className="wrap nav">
        <a href="#top" className="brand" aria-label="1A Zahnarzt, Startseite">
          <ToothMark />
          <b><span>1A</span> Zahnarzt</b>
        </a>
        <nav className="nav-links" aria-label="Hauptnavigation">
          <a href="#leistungen">Leistungen</a>
          <a href="#praxis">Praxis</a>
          <a href="#team">Team</a>
          <a href="#technologie">Technologie</a>
          <a href="#kontakt">Kontakt</a>
        </nav>
        <div className="nav-cta">
          <a href="#kontakt" className="btn btn-gold">Termin vereinbaren</a>
          <button className="burger" aria-label="Menü" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
