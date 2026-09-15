/**
 * A service worker whose only job is to remove a service worker.
 *
 * outlet.saafarsaathi.in briefly served the traveller's PWA, because one repo-wide Railway config
 * decided what two different services built. That app registered its service worker on this
 * origin — and a service worker outlives the mistake that installed it. It answers every
 * navigation from its own cache, so the collectors' app could be deployed, verified and correct on
 * the server while a phone kept showing the tourist tiles. The server's logs proved it: twenty-odd
 * requests for this file and not one for the page itself.
 *
 * Nothing registers this. It does not need registering — a browser holding a stale worker re-fetches
 * that worker's script to see whether it changed, and vite-plugin-pwa writes the traveller's worker
 * to this same path, so the check lands here. That request is the one the stale worker cannot
 * intercept, which makes it the only way in. What it finds is something that takes over at once,
 * throws away every cache on the origin, unregisters itself, and reloads whatever is open.
 *
 * Do not register this from the page. The worker deletes itself and reloads its clients; a page
 * that registered it on load would register it again on that reload, for ever.
 *
 * Afterwards the origin has no service worker at all, which is correct — the collectors' tool is
 * staff software on a phone with signal, not an offline pack. Keep the file anyway. It costs one
 * request that only a poisoned browser ever makes, and deleting it would put the SPA fallback back
 * on this path, which is the trap that made the problem permanent the first time.
 */

self.addEventListener('install', () => {
  // Do not wait for the old worker to release its clients: it is the thing being removed.
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      // Reload anything open, so the traveller's cached shell is replaced on screen and not only
      // on disk. Without this the collector keeps looking at the wrong app until they close the
      // tab. navigate() rejects for a client this worker never controlled, which is not a failure
      // worth abandoning the cleanup for — the caches are already gone and the next load is clean.
      for (const client of await self.clients.matchAll({ type: 'window' })) {
        try {
          await client.navigate(client.url);
        } catch {
          /* the tab will pick up the change when it is next loaded */
        }
      }
    })(),
  );
});
