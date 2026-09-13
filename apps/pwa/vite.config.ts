import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline-first is not a plugin setting, but this is where it starts: everything the shell
// needs is precached, so a cold start with the radio off still paints.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'दुबई साथी',
        short_name: 'साथी',
        lang: 'hi',
        start_url: '/',
        display: 'standalone',
        background_color: '#F7F3EC',
        theme_color: '#1A2456',
      },
      workbox: {
        // The fonts are the app's own typeface, not decoration: Devanagari and Arabic have
        // to be there on a phone with the radio off, so they are precached with everything
        // else. The default 2 MiB per-file ceiling is raised for the same reason.
        globPatterns: ['**/*.{js,css,html,woff2,json}'],
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
