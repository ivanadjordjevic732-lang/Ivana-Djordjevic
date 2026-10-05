# Mindéa Creative Studio – Quellcode

Die auslieferbare App ist **eine einzige Datei**: `../Mindea-Creative-Studio.html`
(einfach im Browser öffnen oder auf einen beliebigen Webspace legen).

Dieser Ordner enthält die modularen Quellen. Nach Änderungen neu bauen:

```
node studio-src/build.mjs
```

| Datei | Modul |
|---|---|
| `styles.css`, `head.html`, `shell.html` | Design-System (Hell/Dunkel/System), App-Gerüst |
| `js/00-util.js` | DOM-Helfer, Icons, Dialoge, Toasts, ZIP, Text-Helfer |
| `js/01-db.js` | IndexedDB (Projekte, Medien, Blobs, Einstellungen) |
| `js/02-state.js` | Projektmodell, Formate, Factories, Undo/Redo (100 Schritte), Autosave |
| `js/03-media.js` | Mediathek, Import, lokale Bildanalyse, Smart Tags, Ranking |
| `js/04-gl.js` | WebGL-Farbengine (Looks, Regler, Vignette, Grain) |
| `js/05-graphics.js` | Motion Graphics (Vektor, Draw-on-Animation) |
| `js/06-render.js` | Canvas-Rendering: Seiten, Text, Formen, Bilder, Captions |
| `js/07-design.js` | Design-Editor (Smart Guides, Ebenen, Seiten, Inspektor) |
| `js/08-templates.js` | Brand Kit, 23 Vorlagen, Markenstile, Magic Resize, Smart Creator |
| `js/09-video-engine.js` | Wiedergabe, Audio-Graph (Ducking, Stimme), Compositor, Übergänge |
| `js/10-timeline.js`, `js/11-video-ui.js` | Timeline (8 Spuren) und Video Studio |
| `js/12-captions.js` | Caption-Engine und Caption Studio |
| `js/13-ai.js` | Claude (optional), Whisper lokal/OpenAI, KI Studio |
| `js/14-autoedit.js` | Analyse (Sprache, Pausen, Szenen, Farbe, Motiv) und Auto Edit |
| `js/15-carousel.js` | Smart Carousel, Video → Karussell, Karussell → Reel, Repurpose |
| `js/16-export.js` | Export Center (PNG/JPG/ZIP, MP4/WebM) |
| `js/17-views.js`, `js/18-app.js` | Start, Medien, Vorlagen, Brand Kit, Navigation, ⌘K, Shortcuts |
