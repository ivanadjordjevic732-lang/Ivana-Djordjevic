import { Navigation } from '@/components/Navigation';
import { Hero } from '@/components/Hero';

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <Navigation />
      <Hero />
      {/* TODO: port Bento, Showcase, Packages, Founder, FAQ, Contact, Footer
          from the legacy index.html into modular components below. */}
      <section className="mx-auto max-w-5xl px-6 py-32 text-center text-muted">
        <p className="font-serif italic text-xl">
          — Die übrigen Sektionen werden in Folge-Sessions portiert.
        </p>
        <p className="mt-4 text-sm tracking-[0.3em] uppercase">
          Aktuell live: die Legacy-Single-File-Variante im Repo-Root.
        </p>
      </section>
    </main>
  );
}
