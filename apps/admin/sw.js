/*
 * The admin app registers no service worker. This file exists so a stale worker from anything
 * ever served on this address unregisters itself, and so no fallback ever answers /sw.js with a
 * page (CLAUDE.md, "A service worker outlives the deploy that installed it").
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  void self.registration.unregister();
});
