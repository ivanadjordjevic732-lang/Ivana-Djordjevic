'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/*
  ScrollScene pinnt eine hohe Sektion (per position: sticky) und übersetzt den
  vertikalen Scroll in einen Slider-Fortschritt 0..(count-1).
  Auf dem Handy ist das Wischen nach oben/unten automatisch die Steuerung.
  Liefert außerdem, ob die Szene sichtbar ist (für Lazy Mounting).
*/
export default function ScrollScene({ count, onProgress, onActiveViewChange, children }) {
  const sectionRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = sectionRef.current;

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        onProgress(self.progress * (count - 1));
      },
    });

    // Canvas erst mounten, wenn die Szene in die Nähe kommt (Lazy Loading).
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => onActiveViewChange && onActiveViewChange(e.isIntersecting)),
      { rootMargin: '20% 0px 20% 0px' }
    );
    io.observe(el);

    return () => {
      st.kill();
      io.disconnect();
    };
  }, [count, onProgress, onActiveViewChange]);

  return (
    <section className="scroll-scene" ref={sectionRef} style={{ height: `${count * 100}vh` }} id="technologie">
      <div className="scroll-sticky">{children}</div>
    </section>
  );
}
