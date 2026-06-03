# Mindéa — Homepage

Eine ruhige, luxuriöse Homepage für **Mindéa Production**. Im Mittelpunkt steht
eine hochwertige 3D-Animation: der goldene Mindéa-Schmetterling aus dem Logo
schwebt über der Startseite, schlägt langsam und edel mit den Flügeln, folgt dem
Scrollen in einer eleganten Parallax-Bewegung und hinterlässt einen feinen
goldenen Glitzerstaub aus GPU-Partikeln.

## Tech-Stack

- **Next.js 14** (App Router) + **TypeScript**
- **React Three Fiber** / **Three.js** für die 3D-Szene
- **@react-three/drei** (In-Memory-Environment für die Gold-Reflexe, ohne
  Netzwerk-Fetch)
- **GSAP ScrollTrigger** für die Scroll-Choreografie und Section-Reveals
- **Tailwind CSS** für das warme Creme-/Gold-Design

## Schnellstart

```bash
npm install
npm run dev      # http://localhost:3000
```

Production-Build:

```bash
npm run build
npm run start
```

## Architektur (modular)

```
src/
├─ app/
│  ├─ layout.tsx          # Fonts (Playfair / DM Sans) + Metadaten
│  ├─ page.tsx            # Hero + Inhaltssektionen
│  └─ globals.css         # Warmes Creme-/Gold-Backdrop, niemals dunkel
└─ components/
   ├─ Hero.tsx            # Hero-Section, lazy-lädt die 3D-Szene (ssr:false)
   ├─ Sections.tsx        # Scrollbarer Inhalt + GSAP-Reveals
   └─ butterfly/
      ├─ HeroButterfly3D.tsx     # <Canvas>, Licht, Environment, Geräteprofil
      ├─ ButterflyModel.tsx      # Schmetterling: Flügelschlag, Schweben, Scroll
      ├─ ParticleTrail.tsx       # GPU-Glitzerstaub (Shader, Additive Blending)
      ├─ geometry.ts             # Flügel-/Körper-Geometrie + Gold-Material
      ├─ useScrollAnimation.ts   # ScrollTrigger → Fortschritt/Velocity (Ref)
      └─ useCursorInteraction.ts # gedämpfte Cursor-Neigung (max. ~9°)
```

### Performance

- **Lazy Loading**: Der gesamte 3D-Bundle (`three`, `drei`) wird per
  `next/dynamic` erst clientseitig nachgeladen; ein leichter Glow dient als
  Fallback.
- **Mobile-optimiert**: reduzierte Partikelzahl und geringere Pixel-Ratio auf
  kleinen Screens; Pause via `IntersectionObserver`, wenn die Hero-Section nicht
  sichtbar ist.
- **GPU-Partikel**: gepoolt, `ShaderMaterial` mit `AdditiveBlending`, keine
  Texturen (Grain wird im Fragment-Shader gezeichnet).
- **`prefers-reduced-motion`** wird respektiert (ruhige Variante ohne Flattern).

### Der Schmetterling

Da kein GLB-Modell vorliegt, ist der Schmetterling – wie im Prompt vorgesehen –
aus extrudierten, bézier-basierten Flügelformen aufgebaut, die der Kontur des
Logos folgen, und mit einem polierten Gold-Material (`MeshStandardMaterial`,
hohe `metalness`) versehen. Die Form lässt sich in
`src/components/butterfly/geometry.ts` weiter an das Logo angleichen.

---

> Hinweis: `index.html` im Repo-Root ist die ältere „Mindéa Workspace“-App und
> bleibt unberührt. Die neue Homepage liegt vollständig unter `src/`.
