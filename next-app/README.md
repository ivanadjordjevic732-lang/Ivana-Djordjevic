# Mindéa · Next.js Migration

Parallel-Aufbau zur bestehenden Single-File-Site (im Repo-Root).
Diese Version verwendet Next.js 15 (App Router), React, TypeScript,
Tailwind CSS, React Three Fiber + Drei und GSAP ScrollTrigger — alles
nach dem Premium-Prompt vom 2026-06-03.

## Status

| Sektion | Stand |
| --- | --- |
| Navigation (sticky, blur on scroll) | ✅ |
| Hero (Cream-Theme, 3D-Butterfly, Particle-Trail, GSAP Scroll, Mouse-Tilt) | ✅ |
| Bento (Leistungen) | ⏳ folgt |
| Cinematic Showcase | ⏳ folgt |
| Prozess | ⏳ folgt |
| Pakete | ⏳ folgt |
| Founder | ⏳ folgt |
| FAQ | ⏳ folgt |
| Kontakt (Web3Forms) | ⏳ folgt |
| Final CTA + Footer | ⏳ folgt |
| Cookie-Banner | ⏳ folgt |

Die alte `index.html` im Repo-Root bleibt deployed, bis die neue
Version inhaltlich gleichwertig ist. Cut-over machen wir am Ende
in einem separaten Commit.

## Setup

```bash
cd next-app
npm install
npm run dev
```

Öffne http://localhost:3000

## Logo 1:1 verwenden

Lege das **echte Mindéa-Logo** ab unter:

```
next-app/public/images/mindea-logo.png
```

PNG mit transparentem Hintergrund. Sobald die Datei vorhanden ist,
ersetzt sie automatisch den geometrisch extrudierten Schmetterling
durch dein Original-Logo (1:1 auf einer 3D-Plane mit Mouse-Tilt,
Scroll-Choreo, Particle-Trail unverändert).

## Deploy

Empfohlen: **Vercel** (Next.js läuft dort out-of-the-box).

```bash
# Im Projekt-Root:
npx vercel
# Folge den Schritten, set "Root Directory" auf next-app/
```

Alternativ: Netlify mit `@netlify/plugin-nextjs` in der Netlify-UI.
Drag-and-Drop-Deploy funktioniert für Next.js nicht mehr — du brauchst
einen Build-Step.

## Architektur

```
next-app/
├── app/
│   ├── layout.tsx       Root layout, fonts, metadata
│   ├── page.tsx         Homepage (mounts Navigation + Hero)
│   ├── globals.css      Cream-Theme tokens + Tailwind base
│   └── fonts.ts         Cormorant Garamond + Inter via next/font
├── components/
│   ├── Navigation.tsx   Sticky top nav with scroll blur
│   ├── Hero.tsx         Hero section + R3F Canvas wrapper
│   ├── Butterfly3D.tsx  Real ExtrudeGeometry butterfly, PBR gold,
│   │                    wing groups, intro timeline, mouse tilt,
│   │                    logo PNG fallback
│   └── ParticleTrail.tsx Gold-dust trail following butterfly
└── lib/
    └── useMouseNormalized.ts  Cursor → normalised [-1, 1] ref
```

## Performance notes

- `Canvas` ist Client-Component → wird nur am Client gerendert
- Geometries werden in `useMemo` einmal erzeugt und automatisch
  von React Three Fiber disposed beim Unmount
- ParticleTrail nutzt einen 240-Punkte Ring-Buffer (kein
  Per-Frame-Allocation)
- DPR auf [1, 2] gecapped
- `RoomEnvironment` via Drei `<Environment preset="apartment">` —
  liefert realistische PBR-Reflections auf dem Gold
- `prefers-reduced-motion` wird in `globals.css` global respektiert

## Was als nächstes zu tun ist

1. Bento (6 Leistungs-Cards) als `<Bento />`
2. Pakete (3 Karten mit Click-to-Expand) als `<Packages />`
3. Founder, FAQ, Kontakt, Footer
4. Cookie-Banner
5. Light-Theme-Anpassung aller Section-Stile (aktuell ist nur Hero
   auf Cream getuned)
6. Lenis Smooth-Scroll integrieren
7. SEO finalisieren (JSON-LD, sitemap.xml, robots.txt)
