import './globals.css';

export const metadata = {
  title: '1A Zahnarzt | Premium Zahnmedizin mit höchster Präzision',
  description:
    'Luxuriöse, moderne Zahnmedizin mit höchster Präzision, Premium-Technologie und 1A-Leistung für Ihr Lächeln.',
  openGraph: {
    title: '1A Zahnarzt',
    description: 'Premium Zahnmedizin mit höchster Präzision und 1A-Leistung für Ihr Lächeln.',
    type: 'website',
    locale: 'de_DE',
  },
};

export const viewport = {
  themeColor: '#0a0a0c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
