import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Baut die komplette Seite in EINE index.html (alles inline),
// die per Doppelklick im Browser läuft, ohne Server.
// Hinweis: Hier wird die 3D-Szene mitgebündelt (kein Lazy-Load),
// das ist für die reine Vorschau gewollt.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist-single',
    target: 'es2019',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
