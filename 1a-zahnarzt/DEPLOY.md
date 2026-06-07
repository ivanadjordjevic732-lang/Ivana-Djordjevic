# 1A Zahnarzt · Premium 3D-Slider (Next.js + React Three Fiber)

Dark-Luxury-Website mit 3D-Karten-Slider. Beim Scrollen gleiten die Karten wie
ein hochwertiger horizontaler Slider, beim Ziehen/Wischen drehen sie sich leicht,
die aktive Karte kommt nach vorne. Hintergrund dunkel mit goldenen Lichtlinien
und feinen Partikeln.

## Stack
Next.js (App Router), React, React Three Fiber, three.js, drei, GSAP ScrollTrigger,
Framer Motion.

## Komponenten
- `components/Dental3DSlider.jsx` – R3F-Canvas, Licht, Kamera, Drag/Swipe-Steuerung
- `components/DentalCard.jsx` – eine 3D-Karte mit Tiefe, Schatten, Glasreflex, Rotation
- `components/AnimatedBackground.jsx` – Partikel und goldene Lichtlinien
- `components/ScrollScene.jsx` – GSAP ScrollTrigger, übersetzt Scroll in Slider-Fortschritt
- `components/CardTextOverlay.jsx` – Texte neben/über den Bildern (Framer Motion)
- `components/FallbackGallery.jsx` – statische Variante bei reduzierter Bewegung

## Starten (Entwicklung)
```bash
npm install
npm run dev
# Adresse erscheint im Terminal, meist http://localhost:3000
```

## Produktion
```bash
npm run build
npm run start
```

## Deploy
- **Vercel** (empfohlen für Next.js): Repo verbinden, fertig. Oder `vercel` CLI.
- **Netlify**: mit dem offiziellen Next.js Runtime/Adapter (Build-Befehl `npm run build`).

## Eigene Bilder einsetzen
In `lib/data.js` bei jeder Karte das Feld `image` auf einen echten Pfad setzen,
z. B. `image: '/images/gebiss.jpg'`, und die Datei unter `public/images/` ablegen.
Ohne `image` wird eine edle, klar markierte Platzhalter-Textur erzeugt.
Empfohlene Bildgröße: hochformat, etwa 768×1024, als komprimiertes WebP/JPG.

## Performance
- Der Canvas wird per `next/dynamic` (ohne SSR) und zusätzlich erst bei
  Sichtbarkeit gemountet (Lazy Loading).
- Geräteklasse (`lib/hooks.js`) senkt auf schwachen Geräten DPR, Partikelzahl,
  Schatten und Postprocessing.
- Bei `prefers-reduced-motion` wird statt der 3D-Szene die statische Galerie gezeigt.

## Platzhalter (mit echten Daten ersetzen)
Adresse, Telefon, Öffnungszeiten, Team, Impressum/Datenschutz und alle Bilder.
