import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { MODEL_CACHE } from './src/features/voice/modelCache.js';

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
        // Everything except speech. The model and the ONNX runtime are 68 MB between them, and
        // putting them in the install step would make every traveller pay for voice, including
        // the ones who only ever tap the tiles. They are cached when the traveller chooses to
        // download the voice, and not before.
        globIgnores: ['**/models/**'],
        // The service worker answers every navigation in its scope with index.html so that a
        // refresh deep in the app works offline. That is right for screens and wrong for files:
        // opening the model URL directly returned the app shell, which then tried to load its
        // assets relative to /models/ and painted a blank page. Real files are exempt.
        navigateFallbackDenylist: [/^\/models\//, /^\/mic-worklet\.js$/],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            /**
             * The model gets a cache of its own, with NO expiry, and this is not a detail.
             *
             * It used to share a cache with the speech runtime under a four-entry limit. The
             * runtime chunk is named by content, so every deployment puts a new entry in — and
             * after four deployments the least recently used entry was evicted. The least recently
             * used entry is the model, because a traveller touches it only when they speak. So
             * shipping a build silently deleted a 42 MB download somebody had waited for on hotel
             * wifi, and the app then told them their phone could not recognise Hindi. On 13
             * September that happened five times in an hour on the owner's own phone.
             *
             * The danger grew when Vosk was replaced: Whisper is fifteen files rather than one, so
             * any entry limit low enough to seem tidy would evict most of a download mid-trip.
             * Downloaded deliberately, deleted only by the traveller. Nothing about a new release
             * is a reason to take it away.
             */
            urlPattern: ({ url }) => url.pathname.startsWith('/models/'),
            handler: 'CacheFirst',
            options: {
              cacheName: MODEL_CACHE,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@saathi/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
});
