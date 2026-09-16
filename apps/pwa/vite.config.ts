import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline-first is not a plugin setting, but this is where it starts: everything the shell
// needs is precached, so a cold start with the radio off still paints.
export default defineConfig({
  // Relative, so the build runs from any path — a subfolder, a preview host, a phone opening
  // a shared link — and not only from a site root.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // The icons ship in the bundle so the home-screen icon is there before the first launch
      // finishes, and stays there with the radio off. `maskable` is padded to 80% because
      // Android crops a circle out of it and would otherwise cut the pin's tip off.
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'दुबई साथी',
        short_name: 'साथी',
        lang: 'hi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F7F3EC',
        theme_color: '#1A2456',
        icons: [
          { src: 'app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'app-icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The fonts are the app's own typeface, not decoration: Devanagari and Arabic have
        // to be there on a phone with the radio off, so they are precached with everything
        // else. The default 2 MiB per-file ceiling is raised for the same reason.
        globPatterns: ['**/*.{js,css,html,woff2,json,png,svg}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  resolve: {
    alias: {
      '@saathi/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
});
