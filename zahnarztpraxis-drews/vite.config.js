import { defineConfig } from 'vite';

// Statischer Build, der als dist-Ordner zu Netlify gezogen werden kann.
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Three.js in einen eigenen Chunk legen, damit der Rest schnell lädt.
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
  },
});
