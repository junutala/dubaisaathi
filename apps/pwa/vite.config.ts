import { defineConfig, type PluginOption } from 'vite';
import type { EmittedAsset } from 'rollup';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * `version.json` — the one file that says, authoritatively and in 60 bytes, which build the
 * server is serving.
 *
 * The app compares it with the build it is actually running, which is the only question that
 * matters after a deploy and the one nothing was asking. It is never cached (nginx says
 * no-store, the worker never precaches it), so the answer cannot itself be stale.
 *
 * `minimumAt` is the lever for the day something ships that is actively wrong: a build older
 * than this applies the update immediately, wherever the traveller is standing, instead of
 * waiting for घर. Empty unless somebody sets it on purpose.
 */
function versionFile(): PluginOption {
  return {
    name: 'saathi-version-file',
    generateBundle(this: { emitFile: (file: EmittedAsset) => void }) {
      const build = (process.env.VITE_BUILD_SHA ?? '').slice(0, 7);
      const at = process.env.VITE_BUILD_TIME ?? '';
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ build, at, minimumAt: '' })}\n`,
      });
    },
  };
}

// Offline-first is not a plugin setting, but this is where it starts: everything the shell
// needs is precached, so a cold start with the radio off still paints.
export default defineConfig({
  // Relative, so the build runs from any path — a subfolder, a preview host, a phone opening
  // a shared link — and not only from a site root.
  base: './',
  plugins: [
    react(),
    versionFile(),
    VitePWA({
      registerType: 'prompt',
      // The icons ship in the bundle so the home-screen icon is there before the first launch
      // finishes, and stays there with the radio off. `maskable` is padded to 80% because
      // Android crops a circle out of it and would otherwise cut the pin's tip off.
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Dubaisaathi',
        short_name: 'Dubaisaathi',
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
        /**
         * The shell is not frozen, and the beacon is never cached.
         *
         * `index.html` names the hashed assets, so a precached copy of it *is* the build: while
         * it sits in the worker's cache, the phone runs that build until the worker agrees to
         * hand over — which on 18 September it would not, on a phone whose tab never closed, for
         * four releases in a row. Taking it out of the precache moves the decision to the
         * network: with a signal the phone loads the shell the server is serving now, and the
         * assets it names are fetched and kept. Without one, the last good shell answers.
         */
        globIgnores: ['index.html', 'version.json'],
        navigateFallback: null,
        /** An activated worker takes the open page with it rather than waiting for a new one. */
        clientsClaim: true,
        runtimeCaching: [
          {
            // The shell: the network decides what the app is, and the cache is the fallback.
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'saathi-shell',
              // A basement in Deira answers slowly or not at all; four seconds and the phone
              // opens on what it has rather than on a spinner.
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 1 },
            },
          },
          {
            /**
             * Hashed and immutable, and kept beyond the build that precached them: a shell served
             * from cache offline may be a build older than the worker, and its assets must still
             * be there. Sixty entries is a handful of releases.
             */
            urlPattern: ({ url }: { url: URL }) => url.pathname.includes('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'saathi-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
          {
            /**
             * The card reader's engine (decision 032), fetched the first time a traveller reads a
             * hotel card and then theirs. A cache of its own, with no expiry and no entry limit,
             * because a shared one with a limit is how a release deleted a traveller's 42 MB voice
             * model: five builds in an hour pushed it out. The paths are versioned, so a new
             * engine is a new name and never an eviction; `repairToLatest` spares this cache by
             * name (app/updates.ts). Never in the precache — the files are copied into the image
             * after the build, so Workbox never sees them, and nobody who does not read a card
             * downloads them.
             */
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/ocr/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'saathi-ocr',
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // A typeface stays a file. The wordmark's subset is 1.2 kB, well under Vite's inlining
    // threshold, and an inlined font becomes a `data:` URL — which the app's own CSP
    // (`font-src 'self'`, deploy/nginx.conf) refuses, so the lockup would quietly fall back to
    // Mukta in production and nowhere else. Fonts are never inlined.
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
  },
  resolve: {
    alias: {
      '@saathi/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
});
