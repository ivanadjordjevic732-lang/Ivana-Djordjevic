import type { Metadata } from 'next';
import { cormorant, inter } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mindéa — Cinematic Brand Studio · Marken, die wirken, bevor sie erklären',
  description:
    'Mindéa, KI-gestütztes Brand Studio aus Salzgitter für cineastische Markeninszenierungen. Brand Films, Editorial Frames und Markenklang aus deinen Bildern und deiner Stimme. Ohne Drehtag.',
  metadataBase: new URL('https://mindea-studio.de'),
  openGraph: {
    title: 'Mindéa — Cinematic Brand Studio',
    description:
      'Marken, die wirken, bevor sie erklären. Cineastische Brand Videos aus deinen Bildern und deiner Stimme. Ohne Drehtag.',
    url: 'https://mindea-studio.de/',
    siteName: 'Mindéa Studio',
    locale: 'de_DE',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="bg-cream text-ink">{children}</body>
    </html>
  );
}
