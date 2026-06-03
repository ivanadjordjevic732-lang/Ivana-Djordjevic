import { Hero } from '@/components/Hero';
import { Sections } from '@/components/Sections';
import { ScrollSound } from '@/components/ScrollSound';

export default function Home() {
  return (
    <main className="relative w-full overflow-x-hidden">
      <Hero />
      <Sections />
      <ScrollSound />
    </main>
  );
}
