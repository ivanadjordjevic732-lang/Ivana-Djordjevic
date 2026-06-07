# Bildplätze für den 3D-Slider

Hier liegt pro Karte ein Platzhalterbild (`.svg`). So setzt du echte Fotos ein:

## Variante A (am einfachsten)
Ersetze die vorhandene Datei durch dein Foto und behalte den Namen bei,
z. B. `gebiss.svg` durch dein Bild ersetzen. Tipp: Wenn dein Foto ein
anderes Format hat (z. B. `.jpg`/`.webp`), nutze Variante B.

## Variante B (sauber, empfohlen)
1. Lege dein Foto hier ab, z. B. `gebiss.jpg`.
2. Öffne `lib/data.js` und ändere den Pfad der Karte auf den neuen Namen,
   z. B. `image: '/images/gebiss.jpg'`.

## Empfehlungen
- Format: WebP oder JPG (gut komprimiert), für scharfe Reflexe gern hochwertig.
- Seitenverhältnis: Hochformat, ca. 768 × 1024 Pixel.
- Motive passend zur Karte: 1A-Gebiss, Instrumente, Veneers, Bohrer, Spiegel,
  Implantat, Keramikzahn, digitale Zahnmedizin.

Die Dateinamen entsprechen den `id`-Feldern in `lib/data.js`:
`gebiss, instrumente, veneers, bohrer, spiegel, implantat, keramik, digital`.
