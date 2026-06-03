# Mindéa Studio · Brand Assets

Lege die folgenden vier Dateien genau unter diesen Namen in diesem
Ordner ab. Die Website verwendet sie automatisch, sobald sie vorhanden
sind. Solange sie fehlen, läuft die Seite mit den SVG-Fallback-Visuals.

## Erforderliche Dateien

| Dateiname             | Was         | Empfohlenes Format                   |
| --------------------- | ----------- | ------------------------------------ |
| `mindea-logo.png`     | Logo        | PNG mit transparentem Hintergrund    |
| `box-presence.jpg`    | Brand Presence Box | JPG, hoch (3:4) oder quadratisch |
| `box-story.jpg`       | Brand Story Box | JPG, hoch (3:4) oder quadratisch |
| `box-impact.jpg`      | Brand Impact Box | JPG, hoch (3:4) oder quadratisch |

## Wo erscheinen sie?

- **`mindea-logo.png`** → Hero (zentriert hinter den schwebenden Boxen)
  und auf jeder Paket-Karte (statt SVG-Schmetterling).
- **`box-presence.jpg` / `box-story.jpg` / `box-impact.jpg`** →
  Hero (drei orbitende Box-Foto-Billboards um das Logo)
  und auf den jeweiligen Paket-Karten weiter unten als Karten-Visual.

## Wie aktualisieren?

Bei jedem Netlify-Deploy: Diesen `images/`-Ordner mit hochziehen.
Bei Git-Workflow: Dateien committen und pushen.
