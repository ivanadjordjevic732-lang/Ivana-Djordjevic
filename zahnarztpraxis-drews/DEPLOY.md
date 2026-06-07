# Deploy & Start

Website der Zahnarztpraxis Dr. med. dent. Martin Drews, Salzgitter-Thiede.
Eigenständiges Projekt mit Vite, Three.js, GSAP/ScrollTrigger und Lenis.

## Voraussetzungen
- Node.js 18 oder neuer (getestet mit Node 20/22)
- npm

## Lokal starten (Entwicklung)
```bash
npm install      # einmalig die Pakete installieren
npm run dev      # Entwicklungsserver, Adresse erscheint im Terminal (z. B. http://localhost:5173)
```

## Produktions-Build
```bash
npm run build    # erzeugt den Ordner dist/
npm run preview  # optional: den fertigen Build lokal ansehen
```

Nach `npm run build` liegt die fertige, statische Seite im Ordner **`dist/`**.

## Deploy auf Netlify (Drag-and-drop)
1. `npm run build` ausführen.
2. Auf https://app.netlify.com/drop gehen.
3. Den Ordner **`dist/`** per Drag-and-drop in das Fenster ziehen. Fertig.

### Alternative: Netlify mit Git verbinden
Die mitgelieferte `netlify.toml` ist bereits vorkonfiguriert:
- Build-Befehl: `npm run build`
- Veröffentlichter Ordner: `dist`
- Falls dieses Projekt in einem Unterordner liegt, ist `base` entsprechend gesetzt.

## Was noch echte Daten braucht (Platzhalter)
Im Code klar markiert (Suche nach „Platzhalter" bzw. `PHOTO-SLOT`):
- **Öffnungszeiten** im Kontaktbereich (aktuell Beispielzeiten)
- **E-Mail-Adresse** (Beispiel hinterlegt)
- **Fotos** (Portrait von Dr. Drews, Praxisräume) an den markierten `.photo-slot`-Stellen
- **Impressum** und **Datenschutz** verlinken
- Optional: `og-image` durch ein echtes Foto ersetzen und die `image`-Felder im JSON-LD füllen

Adresse, Telefon, Schwerpunkt und die 5,0-Bewertung sind real recherchiert.

## Technische Hinweise
- Die 3D-Hero-Szene lädt **nur auf dem Desktop** und nur, wenn keine reduzierte
  Bewegung gewünscht ist. Auf Mobilgeräten und bei `prefers-reduced-motion`
  erscheint ein ebenso edler Verlauf statt der Szene. So bleibt die Seite schnell.
- Three.js und GSAP werden in eigene Chunks gesplittet und die Szene erst geladen,
  wenn der Hero sichtbar ist (Lazy Loading).
