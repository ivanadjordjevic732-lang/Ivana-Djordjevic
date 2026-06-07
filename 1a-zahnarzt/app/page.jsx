import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import SliderSection from '@/components/SliderSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <SliderSection />
      </main>
      <Footer />
    </>
  );
}
